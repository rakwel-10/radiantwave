using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.FileProviders;

// ---------------------------------------------------------------------------
// Radiant Wave Technologies — Interactive Video Qualification Application
// Self-contained ASP.NET Core minimal API. No external NuGet packages.
// Persistence: JSON files under /Data. Videos under /videos.
// ---------------------------------------------------------------------------

var builder = WebApplication.CreateBuilder(args);

// Allow large video uploads (production videos can be big).
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 4L * 1024 * 1024 * 1024); // 4 GB
builder.Services.Configure<FormOptions>(o =>
{
    o.MultipartBodyLengthLimit = 4L * 1024 * 1024 * 1024;
    o.ValueLengthLimit = int.MaxValue;
});

var app = builder.Build();

var contentRoot = app.Environment.ContentRootPath;
var dataDir = Path.Combine(contentRoot, "Data");
var videosDir = Path.Combine(contentRoot, "videos");
var adminUiDir = Path.Combine(contentRoot, "AdminUi");
Directory.CreateDirectory(dataDir);
Directory.CreateDirectory(videosDir);

var store = new Store(Path.Combine(dataDir, "config.json"), Path.Combine(dataDir, "events.json"));

// ---- Static file serving --------------------------------------------------
app.UseDefaultFiles();
app.UseStaticFiles();

// Serve videos from /videos with caching disabled so replacements take effect immediately.
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(videosDir),
    RequestPath = "/videos",
    ServeUnknownFileTypes = true,
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate";
    }
});

// ---- Admin session handling ----------------------------------------------
var sessions = new ConcurrentDictionary<string, DateTime>();
const string AdminCookie = "rw_admin";
const string HiddenAdminRoute = "/rw-control-92x";

bool IsAdmin(HttpContext ctx)
{
    if (!ctx.Request.Cookies.TryGetValue(AdminCookie, out var token) || string.IsNullOrEmpty(token))
        return false;
    if (!sessions.TryGetValue(token, out var expiry)) return false;
    if (expiry < DateTime.UtcNow) { sessions.TryRemove(token, out _); return false; }
    return true;
}

IResult RequireAdmin(HttpContext ctx) =>
    IsAdmin(ctx) ? Results.Empty : Results.Json(new { error = "unauthorized" }, statusCode: 401);

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------

// Public config consumed by the experience (no secrets).
app.MapGet("/api/config", () =>
{
    var c = store.Config;
    return Results.Json(new
    {
        timings = c.Timings,
        text = c.Text,
        ghlEmbed = c.GhlEmbed,
        redirectUrl = c.RedirectUrl,
        videos = new
        {
            v1 = VideoExists(1),
            v2 = VideoExists(2),
            v3 = VideoExists(3)
        }
    });
});

// Record an analytics event.
app.MapPost("/api/event", async (HttpContext ctx) =>
{
    var ev = await ReadJson<EventInput>(ctx);
    if (ev is null || string.IsNullOrWhiteSpace(ev.Type))
        return Results.BadRequest(new { error = "type required" });
    if (!AllowedEvents.Contains(ev.Type))
        return Results.BadRequest(new { error = "unknown event type" });
    store.AddEvent(ev.Type, ev.Meta);
    return Results.Json(new { ok = true });
});

// ---------------------------------------------------------------------------
// ADMIN — auth
// ---------------------------------------------------------------------------

app.MapPost("/api/admin/login", async (HttpContext ctx) =>
{
    var body = await ReadJson<LoginInput>(ctx);
    if (body is null || string.IsNullOrEmpty(body.Password))
        return Results.Json(new { error = "password required" }, statusCode: 400);

    if (!PasswordHasher.Verify(body.Password, store.Config.AdminPasswordHash))
        return Results.Json(new { error = "invalid credentials" }, statusCode: 401);

    var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    sessions[token] = DateTime.UtcNow.AddHours(8);
    ctx.Response.Cookies.Append(AdminCookie, token, new CookieOptions
    {
        HttpOnly = true,
        SameSite = SameSiteMode.Lax,
        Secure = ctx.Request.IsHttps,
        MaxAge = TimeSpan.FromHours(8)
    });
    return Results.Json(new { ok = true });
});

app.MapPost("/api/admin/logout", (HttpContext ctx) =>
{
    if (ctx.Request.Cookies.TryGetValue(AdminCookie, out var token) && token is not null)
        sessions.TryRemove(token, out _);
    ctx.Response.Cookies.Delete(AdminCookie);
    return Results.Json(new { ok = true });
});

app.MapGet("/api/admin/session", (HttpContext ctx) =>
    Results.Json(new { authenticated = IsAdmin(ctx) }));

app.MapPost("/api/admin/password", async (HttpContext ctx) =>
{
    var guard = RequireAdmin(ctx); if (guard is not EmptyHttpResult) return guard;
    var body = await ReadJson<PasswordChange>(ctx);
    if (body is null || string.IsNullOrEmpty(body.Current) || string.IsNullOrEmpty(body.Next))
        return Results.Json(new { error = "current and next required" }, statusCode: 400);
    if (!PasswordHasher.Verify(body.Current, store.Config.AdminPasswordHash))
        return Results.Json(new { error = "current password incorrect" }, statusCode: 401);
    if (body.Next.Length < 6)
        return Results.Json(new { error = "new password must be at least 6 characters" }, statusCode: 400);
    store.Update(c => c.AdminPasswordHash = PasswordHasher.Hash(body.Next));
    return Results.Json(new { ok = true });
});

// ---------------------------------------------------------------------------
// ADMIN — config (timings + text + settings)
// ---------------------------------------------------------------------------

app.MapGet("/api/admin/config", (HttpContext ctx) =>
{
    var guard = RequireAdmin(ctx); if (guard is not EmptyHttpResult) return guard;
    var c = store.Config;
    return Results.Json(new
    {
        timings = c.Timings,
        text = c.Text,
        ghlEmbed = c.GhlEmbed,
        redirectUrl = c.RedirectUrl,
        videos = new { v1 = VideoExists(1), v2 = VideoExists(2), v3 = VideoExists(3) }
    });
});

app.MapPut("/api/admin/config", async (HttpContext ctx) =>
{
    var guard = RequireAdmin(ctx); if (guard is not EmptyHttpResult) return guard;
    var body = await ReadJson<ConfigUpdate>(ctx);
    if (body is null) return Results.Json(new { error = "invalid body" }, statusCode: 400);

    store.Update(c =>
    {
        if (body.Timings is not null)
        {
            c.Timings.Video1Trigger = Math.Max(0, body.Timings.Video1Trigger);
            c.Timings.Video2Trigger = Math.Max(0, body.Timings.Video2Trigger);
            c.Timings.Video3Trigger = Math.Max(0, body.Timings.Video3Trigger);
        }
        if (body.Text is not null) c.Text = body.Text;
        if (body.GhlEmbed is not null) c.GhlEmbed = body.GhlEmbed;
        if (body.RedirectUrl is not null) c.RedirectUrl = body.RedirectUrl;
    });
    return Results.Json(new { ok = true });
});

// ---------------------------------------------------------------------------
// ADMIN — video upload / replace / delete
// ---------------------------------------------------------------------------

app.MapPost("/api/admin/video/{slot:int}", async (int slot, HttpContext ctx) =>
{
    var guard = RequireAdmin(ctx); if (guard is not EmptyHttpResult) return guard;
    if (slot is < 1 or > 3) return Results.Json(new { error = "slot must be 1-3" }, statusCode: 400);
    if (!ctx.Request.HasFormContentType)
        return Results.Json(new { error = "multipart form required" }, statusCode: 400);

    var form = await ctx.Request.ReadFormAsync();
    var file = form.Files.GetFile("video") ?? form.Files.FirstOrDefault();
    if (file is null || file.Length == 0)
        return Results.Json(new { error = "no file" }, statusCode: 400);

    var target = Path.Combine(videosDir, $"video{slot}.mp4");
    var tmp = target + ".uploading";
    await using (var fs = File.Create(tmp))
        await file.CopyToAsync(fs);
    File.Move(tmp, target, overwrite: true);

    return Results.Json(new { ok = true, slot, size = file.Length });
});

app.MapDelete("/api/admin/video/{slot:int}", (int slot, HttpContext ctx) =>
{
    var guard = RequireAdmin(ctx); if (guard is not EmptyHttpResult) return guard;
    if (slot is < 1 or > 3) return Results.Json(new { error = "slot must be 1-3" }, statusCode: 400);
    var target = Path.Combine(videosDir, $"video{slot}.mp4");
    if (File.Exists(target)) File.Delete(target);
    return Results.Json(new { ok = true });
});

// ---------------------------------------------------------------------------
// ADMIN — analytics
// ---------------------------------------------------------------------------

app.MapGet("/api/admin/analytics", (HttpContext ctx) =>
{
    var guard = RequireAdmin(ctx); if (guard is not EmptyHttpResult) return guard;
    return Results.Json(store.BuildAnalytics());
});

// ---------------------------------------------------------------------------
// Hidden admin UI route (not linked anywhere; served outside wwwroot)
// ---------------------------------------------------------------------------
app.MapGet(HiddenAdminRoute, async (HttpContext ctx) =>
{
    var path = Path.Combine(adminUiDir, "admin.html");
    if (!File.Exists(path)) return Results.NotFound();
    ctx.Response.ContentType = "text/html; charset=utf-8";
    await ctx.Response.SendFileAsync(path);
    return Results.Empty;
});

// ---------------------------------------------------------------------------
// GHL form "On Submit → Redirect" target.
// Works whether GHL redirects the iframe or the top window: if we're inside a
// frame we break out to the top experience; either way we resume at Video 1.
// ---------------------------------------------------------------------------
app.MapGet("/continue", () => Results.Content(ContinuePage, "text/html; charset=utf-8"));

bool VideoExists(int slot) => File.Exists(Path.Combine(videosDir, $"video{slot}.mp4"));

app.Run();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

static async Task<T?> ReadJson<T>(HttpContext ctx)
{
    try
    {
        return await ctx.Request.ReadFromJsonAsync<T>(JsonOpts.Default);
    }
    catch { return default; }
}

static class JsonOpts
{
    public static readonly JsonSerializerOptions Default = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };
}

// Whitelisted analytics event types.
public partial class Program
{
    // Lightweight breakout page used as the GHL post-submit redirect target.
    public const string ContinuePage = """
        <!doctype html>
        <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Continuing…</title>
          <style>
            html,body{margin:0;height:100%;background:#121824;color:#94a3b8;
              font-family:system-ui,-apple-system,sans-serif;display:grid;place-items:center}
            .x{display:flex;flex-direction:column;align-items:center;gap:16px;font-size:14px;letter-spacing:.04em}
            .p{width:54px;height:54px;border-radius:50%;
              background:radial-gradient(circle,rgba(41,182,230,.85),transparent 70%);
              animation:pulse 1.5s ease-in-out infinite}
            @keyframes pulse{0%,100%{transform:scale(.9);opacity:.7}50%{transform:scale(1.1);opacity:1}}
          </style>
        </head>
        <body>
          <div class="x"><div class="p"></div><div>Unlocking your experience…</div></div>
          <script>
            (function () {
              var target = "/?begin=1";
              try {
                if (window.top && window.top !== window.self) window.top.location.replace(target);
                else window.location.replace(target);
              } catch (e) { window.location.replace(target); }
            })();
          </script>
        </body>
        </html>
        """;

    public static readonly HashSet<string> AllowedEvents = new()
    {
        "registration",
        "video1_complete", "video2_complete", "video3_complete",
        "option1", "option2", "option3",
        "qualification_complete",
        "final_cta_click",
        "valuation_q1", "valuation_q2"
    };
}

// ---------------------------------------------------------------------------
// Password hashing (PBKDF2, built-in)
// ---------------------------------------------------------------------------
static class PasswordHasher
{
    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(Encoding.UTF8.GetBytes(password), salt, 100_000, HashAlgorithmName.SHA256, 32);
        return $"{Convert.ToHexString(salt)}:{Convert.ToHexString(hash)}";
    }

    public static bool Verify(string password, string stored)
    {
        var parts = stored.Split(':');
        if (parts.Length != 2) return false;
        try
        {
            var salt = Convert.FromHexString(parts[0]);
            var expected = Convert.FromHexString(parts[1]);
            var actual = Rfc2898DeriveBytes.Pbkdf2(Encoding.UTF8.GetBytes(password), salt, 100_000, HashAlgorithmName.SHA256, expected.Length);
            return CryptographicOperations.FixedTimeEquals(expected, actual);
        }
        catch { return false; }
    }
}

// ---------------------------------------------------------------------------
// Thread-safe JSON store
// ---------------------------------------------------------------------------
class Store
{
    private readonly string _configPath;
    private readonly string _eventsPath;
    private readonly object _lock = new();
    private AppConfig _config;
    private List<EventRecord> _events;

    public Store(string configPath, string eventsPath)
    {
        _configPath = configPath;
        _eventsPath = eventsPath;
        _config = Load<AppConfig>(_configPath) ?? AppConfig.CreateDefault();
        if (string.IsNullOrEmpty(_config.AdminPasswordHash))
            _config.AdminPasswordHash = PasswordHasher.Hash("radiantwave");
        SaveConfig();
        _events = Load<List<EventRecord>>(_eventsPath) ?? new List<EventRecord>();
    }

    public AppConfig Config { get { lock (_lock) return _config; } }

    public void Update(Action<AppConfig> mutate)
    {
        lock (_lock)
        {
            mutate(_config);
            SaveConfig();
        }
    }

    public void AddEvent(string type, string? meta)
    {
        lock (_lock)
        {
            _events.Add(new EventRecord { Type = type, Meta = meta, At = DateTime.UtcNow });
            File.WriteAllText(_eventsPath, JsonSerializer.Serialize(_events, JsonOpts.Default));
        }
    }

    public object BuildAnalytics()
    {
        lock (_lock)
        {
            int Count(string t) => _events.Count(e => e.Type == t);
            Dictionary<string, int> ValuationBuckets(string t)
            {
                var buckets = new Dictionary<string, int>
                {
                    ["$10,000"] = 0, ["$100,000"] = 0, ["$1,000,000"] = 0, ["Priceless"] = 0
                };
                foreach (var e in _events.Where(e => e.Type == t && e.Meta is not null))
                    if (buckets.ContainsKey(e.Meta!)) buckets[e.Meta!]++;
                return buckets;
            }

            return new
            {
                registrations = Count("registration"),
                video1Completions = Count("video1_complete"),
                video2Completions = Count("video2_complete"),
                video3Completions = Count("video3_complete"),
                option1 = Count("option1"),
                option2 = Count("option2"),
                option3 = Count("option3"),
                qualificationCompletions = Count("qualification_complete"),
                finalCtaClicks = Count("final_cta_click"),
                valuationQ1 = ValuationBuckets("valuation_q1"),
                valuationQ2 = ValuationBuckets("valuation_q2"),
                totalEvents = _events.Count
            };
        }
    }

    private void SaveConfig() =>
        File.WriteAllText(_configPath, JsonSerializer.Serialize(_config, JsonOpts.Default));

    private static T? Load<T>(string path)
    {
        if (!File.Exists(path)) return default;
        try { return JsonSerializer.Deserialize<T>(File.ReadAllText(path), JsonOpts.Default); }
        catch { return default; }
    }
}

// ---------------------------------------------------------------------------
// Data models
// ---------------------------------------------------------------------------
class AppConfig
{
    public Timings Timings { get; set; } = new();
    public TextContent Text { get; set; } = new();
    public string GhlEmbed { get; set; } = """
        <iframe
            src="https://link.sillabledigital.com/widget/form/WlpuqvONea8p5y1UEfMZ"
            style="width:100%;height:100%;border:none;border-radius:3px"
            id="inline-WlpuqvONea8p5y1UEfMZ"
            data-layout="{'id':'INLINE'}"
            data-trigger-type="alwaysShow"
            data-trigger-value=""
            data-activation-type="alwaysActivated"
            data-activation-value=""
            data-deactivation-type="neverDeactivate"
            data-deactivation-value=""
            data-form-name="Radiant Wave Form for 3 Videos"
            data-height="718"
            data-layout-iframe-id="inline-WlpuqvONea8p5y1UEfMZ"
            data-form-id="WlpuqvONea8p5y1UEfMZ"
            title="Radiant Wave Form for 3 Videos">
        </iframe>
        <script src="https://link.sillabledigital.com/js/form_embed.js"></script>
        """;
    public string RedirectUrl { get; set; } = "https://rhema-wave-website.vercel.app/";
    public string AdminPasswordHash { get; set; } = "";

    public static AppConfig CreateDefault() => new();
}

class Timings
{
    // Seconds after the video starts.
    public double Video1Trigger { get; set; } = 5;
    public double Video2Trigger { get; set; } = 7;
    public double Video3Trigger { get; set; } = 5;
}

class TextContent
{
    public string WelcomeHeading { get; set; } = "Welcome to Radiant Wave Technologies";
    public string WelcomeBody { get; set; } =
        "This is a private, invitation-only page. You have been granted temporary access. To proceed, we require some information from you. Your information will remain private and will not be shared.";
    public string Video1Cta { get; set; } = "Continue to Next Video";
    public string DecisionHeading { get; set; } = "Please choose which of the following is most appealing to you:";
    public string Option1 { get; set; } =
        "I want to forget I ever watched this video, ignore everything I learned, and hope I never suffer the consequences.";
    public string Option2 { get; set; } =
        "I realize that unless I do something about it, my health may continue declining, but I choose to ignore it and hope I never suffer the consequences.";
    public string Option3 { get; set; } =
        "I will find a way to spend time in Radiant Waves, either by visiting a center, opening a center, or purchasing a system for my home or office to support my health and wellbeing.";
    public string DisqualMessage { get; set; } =
        "Thank you for taking the time to learn more about Radiant Wave Technologies. We appreciate your interest and wish you and your family the very best. Unfortunately, your selection does not qualify you to proceed further.";
    public string CongratsMessage { get; set; } =
        "Choosing Option #3 shows that you are earnest, insightful, decisive, and deeply value health, wellbeing, vitality, and longevity. Before continuing, please answer the following questions.";
    public string ValuationQ1 { get; set; } =
        "What value do you place on your own health, wellbeing, vitality, and longevity?";
    public string ValuationQ2 { get; set; } =
        "What value do you place on the health, wellbeing, vitality, and longevity of your family and loved ones?";
    public string QualifyContinue { get; set; } = "Continue to Final Video";
    public string Video3Cta { get; set; } = "Continue to Radiant Wave Technologies";
}

record EventRecord
{
    public string Type { get; set; } = "";
    public string? Meta { get; set; }
    public DateTime At { get; set; }
}

record EventInput(string Type, string? Meta);
record LoginInput(string Password);
record PasswordChange(string Current, string Next);
record ConfigUpdate(Timings? Timings, TextContent? Text, string? GhlEmbed, string? RedirectUrl);

/* ============================================================
   Static fallback config — used when there is no backend
   (e.g. a static deploy on Cloudflare Pages / Netlify).
   When the .NET backend IS present, /api/config takes priority
   and this is ignored. Edit values here, then redeploy.
   ============================================================ */
window.RW_STATIC_CONFIG = {
  "timings": { "video1Trigger": 10, "video2Trigger": 7, "video3Trigger": 5 },
  "text": {
    "welcomeHeading": "Welcome to Radiant Wave Technologies",
    "welcomeBody": "This is a private, invitation-only page. You have been granted temporary access. To proceed, we require some information from you. Your information will remain private and will not be shared.",
    "decisionHeading": "Please choose which of the following is most appealing to you:",
    "option1": "I want to forget I ever watched this video, ignore everything I learned, and hope I never suffer the consequences.",
    "option2": "I realize that unless I do something about it, my health may continue declining, but I choose to ignore it and hope I never suffer the consequences.",
    "option3": "I will find a way to spend time in Radiant Waves, either by visiting a center, opening a center, or purchasing a system for my home or office to support my health and wellbeing.",
    "disqualMessage": "Thank you for taking the time to learn more about Radiant Wave Technologies. We appreciate your interest and wish you and your family the very best. Unfortunately, your selection does not qualify you to proceed further.",
    "congratsMessage": "Choosing Option #3 shows that you are earnest, insightful, decisive, and deeply value health, wellbeing, vitality, and longevity. Before continuing, please answer the following questions.",
    "valuationQ1": "What value do you place on your own health, wellbeing, vitality, and longevity?",
    "valuationQ2": "What value do you place on the health, wellbeing, vitality, and longevity of your family and loved ones?",
    "video3Cta": "Continue to Radiant Wave Technologies"
  },
  "ghlEmbed": "<iframe src=\"https://link.sillabledigital.com/widget/form/WlpuqvONea8p5y1UEfMZ\" style=\"width:100%;height:100%;border:none;border-radius:3px\" id=\"inline-WlpuqvONea8p5y1UEfMZ\" data-layout=\"{'id':'INLINE'}\" data-trigger-type=\"alwaysShow\" data-trigger-value=\"\" data-activation-type=\"alwaysActivated\" data-activation-value=\"\" data-deactivation-type=\"neverDeactivate\" data-deactivation-value=\"\" data-form-name=\"Radiant Wave Form for 3 Videos\" data-height=\"718\" data-layout-iframe-id=\"inline-WlpuqvONea8p5y1UEfMZ\" data-form-id=\"WlpuqvONea8p5y1UEfMZ\" title=\"Radiant Wave Form for 3 Videos\"></iframe><script src=\"https://link.sillabledigital.com/js/form_embed.js\"></scr" + "ipt>",
  "redirectUrl": "/home",
  "videosBaseUrl": "https://github.com/rakwel-10/radiantwave/releases/download/videos"
};

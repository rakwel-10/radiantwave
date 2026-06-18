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
    "decisionHeading": "Please choose the option that best describes how you feel after viewing this presentation:",
    "option1": "This not only sounds like science fiction and too good to be true—it sounds like those responsible for this crackpot idea should be locked up in a loony bin, and they should throw away the key!",
    "option2": "I think I understand the general idea behind this concept, but I don’t feel comfortable doing anything until a large portion of the population has already proven its validity.",
    "option3": "This sounds like a miraculous breakthrough in modern science! I want to know what it feels like to have my 37 trillion tiny microscopic cellular batteries charged like when I was younger. I would also like the energy to support my immune system so it remains strong and resilient!",
    "disqualMessage": "Thank you for visiting our site. We wish you and your family the very best. Unfortunately, you are not qualified to proceed.",
    "disqualMessage2": "Thank you for visiting our site. We wish you and your family the very best. We will contact you in the future using the email address you provided once a large portion of the population has proven the validity of Radiant Wave Technologies. However, at this time, you are not qualified to proceed.",
    "kcCongrats": "Congratulations! You have been granted access to the next presentation.",
    "congratsMessage": "Before continuing to the final presentation, please answer the following two questions.",
    "valuationQ1": "What value do you place on your own health, wellbeing, vitality, and longevity?",
    "valuationQ2": "What value do you place on the health, wellbeing, vitality, and longevity of your family and loved ones?",
    "video3Cta": "Continue to Radiant Wave Technologies"
  },
  "ghlEmbed": "<iframe src=\"https://link.sillabledigital.com/widget/form/WlpuqvONea8p5y1UEfMZ\" style=\"width:100%;height:100%;border:none;border-radius:3px\" id=\"inline-WlpuqvONea8p5y1UEfMZ\" data-layout=\"{'id':'INLINE'}\" data-trigger-type=\"alwaysShow\" data-trigger-value=\"\" data-activation-type=\"alwaysActivated\" data-activation-value=\"\" data-deactivation-type=\"neverDeactivate\" data-deactivation-value=\"\" data-form-name=\"Radiant Wave Form for 3 Videos\" data-height=\"718\" data-layout-iframe-id=\"inline-WlpuqvONea8p5y1UEfMZ\" data-form-id=\"WlpuqvONea8p5y1UEfMZ\" title=\"Radiant Wave Form for 3 Videos\"></iframe><script src=\"https://link.sillabledigital.com/js/form_embed.js\"></scr" + "ipt>",
  "redirectUrl": "https://rhema-wave-website.vercel.app/",
  "videosBaseUrl": "https://github.com/rakwel-10/radiantwave/releases/download/videos"
};

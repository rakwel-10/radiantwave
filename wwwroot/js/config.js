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
    "decisionHeading": "Which option best describes how you feel?",
    "option1": "Science Fiction",
    "option2": "Skeptical",
    "option3": "Miraculous Breakthrough",
    "disqualMessage": "Thank you for visiting our site. We wish you and your family the very best. Unfortunately, you are not qualified to proceed.",
    "disqualMessage2": "Thank you for visiting our site. We wish you and your family the very best. We will contact you in the future using the email address you provided once a large portion of the population has proven the validity of Radiant Wave Technologies. However, at this time, you are not qualified to proceed.",
    "kcCongrats": "Congratulations! You have been granted access to the next presentation.",
    "decision2Lead": "Since our environment on Earth has become increasingly stressful and overloaded with pollutants, toxins, carcinogens, heavy metals, microplastics, radiation, and free radicals—all of which are nearly impossible to avoid unless we somehow colonize another planet—we are faced with a choice.",
    "decision2Prompt": "Which best describes how you feel?",
    "optionA": "I wish you didn’t tell me",
    "optionB": "Still skeptical",
    "optionC": "Tell me more",
    "disqualA": "We appreciate you taking the time to learn more about Radiant Wave Technologies and wish you and your family the very best. Unfortunately, your choice of Option A disqualifies you from proceeding further.",
    "disqualB": "We appreciate you taking the time to learn more about Radiant Wave Technologies. We are glad you acknowledge the unhealthy environment in which we live and hope that one day you will recognize the value of Radiant Wave Technology. We wish you and your family the very best. Unfortunately, your choice of Option B disqualifies you from proceeding further.",
    "congratsMessage": "Before you go…",
    "valuationQ1": "What value do you place on your health, well-being, and vitality?",
    "valuationQ2": "What value do you place on the health, wellbeing, vitality, and longevity of YOUR FAMILY and LOVED ONES?",
    "valuationQ3": "If you were offered the opportunity to share this incredible technology with the world and be compensated for your efforts, what value would you place on that opportunity?",
    "qualifyProceed": "Proceed to the Next Presentation",
    "video3Cta": "Continue to Radiant Wave Technologies"
  },
  "ghlEmbed": "<iframe src=\"https://link.sillabledigital.com/widget/form/WlpuqvONea8p5y1UEfMZ\" style=\"width:100%;height:100%;border:none;border-radius:3px\" id=\"inline-WlpuqvONea8p5y1UEfMZ\" data-layout=\"{'id':'INLINE'}\" data-trigger-type=\"alwaysShow\" data-trigger-value=\"\" data-activation-type=\"alwaysActivated\" data-activation-value=\"\" data-deactivation-type=\"neverDeactivate\" data-deactivation-value=\"\" data-form-name=\"Radiant Wave Form for 3 Videos\" data-height=\"718\" data-layout-iframe-id=\"inline-WlpuqvONea8p5y1UEfMZ\" data-form-id=\"WlpuqvONea8p5y1UEfMZ\" title=\"Radiant Wave Form for 3 Videos\"></iframe><script src=\"https://link.sillabledigital.com/js/form_embed.js\"></scr" + "ipt>",
  "redirectUrl": "https://radiantwave-3d.vercel.app/",
  "videosBaseUrl": "https://github.com/rakwel-10/radiantwave/releases/download/videos"
};

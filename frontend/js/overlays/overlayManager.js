import { initialiseProfile, updateUserData } from "./overlayStorage.js";
import { trackVisitorPageView } from "../api.js";

import { initialiseExitIntent } from "./overlayTriggers.js";

import { evaluateWelcomeOverlay, evaluateExitIntentOverlay } from "./overlayRules.js";

let sessionTrackingPromise;

function updateSessionTracking() {
  if (!sessionTrackingPromise) {
    sessionTrackingPromise = trackVisitorPageView()
      .then((tracking) => updateUserData(tracking))
      .catch(() => {});
  }
}

export function initialiseOverlays() {
  updateSessionTracking();
  initialiseProfile();

  evaluateWelcomeOverlay();

  initialiseExitIntent(() => {
    evaluateExitIntentOverlay();
  });
}

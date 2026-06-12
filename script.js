(() => {
  "use strict";

  const MESSAGES = [
    "Hello!",
    "Thank you for visiting OmerHuroglu.com.",
    "More information can be found in the menu.",
  ];

  const MESSAGE_CURSOR_HTML = '<span class="message__cursor">|</span>';
  const OPEN_CLASS = "is-open";

  const SELECTORS = {
    currentYear: "[data-current-year]",
    information: ".information",
    informationLink: ".information__link",
    informationLinks: "[data-information-links]",
    informationToggle: "[data-information-toggle]",
    messageStatus: "[data-message-status]",
    messageText: "[data-message-text]",
  };

  const TIMING = {
    informationCascadeDelay: 100,
    messageDeleteDelay: 50,
    messageHoldDelay: 3000,
    messageTypeDelay: 100,
    pointerHoldDelay: 100,
    pointerHoldRestartDelay: 100,
  };

  const elements = {
    currentYear: getRequiredElement(SELECTORS.currentYear),
    informationLinks: getRequiredElement(SELECTORS.informationLinks),
    informationToggle: getRequiredElement(SELECTORS.informationToggle),
    messageStatus: getRequiredElement(SELECTORS.messageStatus),
    messageText: getRequiredElement(SELECTORS.messageText),
  };

  const messageState = {
    characterIndex: 0,
    isDeleting: false,
    messageIndex: 0,
  };

  const informationState = {
    observer: null,
  };

  const pointerState = {
    holdIntervalId: null,
    holdRestartTimeoutId: null,
    isPressing: false,
    x: 0,
    y: 0,
  };

  function getRequiredElement(selector) {
    const element = document.querySelector(selector);

    if (!element) {
      throw new Error(`Missing required element: ${selector}`);
    }

    return element;
  }

  function getClosestEventTarget(event, selector) {
    if (!(event.target instanceof Element)) {
      return null;
    }

    return event.target.closest(selector);
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function getCurrentMessage() {
    return MESSAGES[messageState.messageIndex];
  }

  function setMessageText(text) {
    elements.messageText.innerHTML = `${text}${MESSAGE_CURSOR_HTML}`;
  }

  function setMessageStatus() {
    elements.messageStatus.textContent = getCurrentMessage();
  }

  function typeMessage() {
    const currentMessage = getCurrentMessage();

    messageState.characterIndex += messageState.isDeleting ? -1 : 1;
    setMessageText(currentMessage.slice(0, messageState.characterIndex));

    if (!messageState.isDeleting && messageState.characterIndex === currentMessage.length) {
      messageState.isDeleting = true;
      window.setTimeout(typeMessage, TIMING.messageHoldDelay);
      return;
    }

    if (messageState.isDeleting && messageState.characterIndex === 0) {
      messageState.isDeleting = false;
      messageState.messageIndex = (messageState.messageIndex + 1) % MESSAGES.length;
      setMessageStatus();
      window.setTimeout(typeMessage, TIMING.messageHoldDelay);
      return;
    }

    window.setTimeout(
      typeMessage,
      messageState.isDeleting ? TIMING.messageDeleteDelay : TIMING.messageTypeDelay
    );
  }

  function initializeMessage() {
    setMessageText("");
    setMessageStatus();
    window.setTimeout(typeMessage, TIMING.messageHoldDelay);
  }

  function getInformationLinks() {
    return Array.from(elements.informationLinks.querySelectorAll(SELECTORS.informationLink));
  }

  function getCenterDistance(index, totalItems) {
    return Math.abs(index - (totalItems - 1) / 2);
  }

  function updateInformationLinkOrder() {
    const links = getInformationLinks();

    if (links.length === 0) {
      elements.informationLinks.style.setProperty("--information-link-max-delay", "0ms");
      return;
    }

    const distances = links.map((_, index) => getCenterDistance(index, links.length));
    const closestDistanceToCenter = Math.min(...distances);
    let maxDelay = 0;

    links.forEach((link, index) => {
      const centerDistance = distances[index] - closestDistanceToCenter;
      const delay = Math.round(centerDistance * TIMING.informationCascadeDelay);

      maxDelay = Math.max(maxDelay, delay);
      link.style.setProperty("--information-link-delay", `${delay}ms`);
    });

    elements.informationLinks.style.setProperty("--information-link-max-delay", `${maxDelay}ms`);
  }

  function isInformationOpen() {
    return elements.informationLinks.classList.contains(OPEN_CLASS);
  }

  function setInformationOpen(isOpen) {
    elements.informationLinks.classList.toggle(OPEN_CLASS, isOpen);
    elements.informationToggle.classList.toggle(OPEN_CLASS, isOpen);
    elements.informationToggle.setAttribute("aria-expanded", String(isOpen));
    elements.informationToggle.setAttribute(
      "aria-label",
      isOpen ? "Close information menu" : "Open information menu"
    );
  }

  function toggleInformation() {
    setInformationOpen(!isInformationOpen());
  }

  function closeInformation() {
    setInformationOpen(false);
  }

  function observeInformationLinks() {
    informationState.observer = new MutationObserver(updateInformationLinkOrder);
    informationState.observer.observe(elements.informationLinks, {
      childList: true,
      subtree: true,
    });
  }

  function isPointerExcluded(event) {
    return Boolean(getClosestEventTarget(event, SELECTORS.information));
  }

  function createPointerBloom(x, y) {
    if (prefersReducedMotion()) {
      return;
    }

    const pointerBloom = document.createElement("div");

    pointerBloom.className = "pointer-bloom";
    pointerBloom.style.left = `${x}px`;
    pointerBloom.style.top = `${y}px`;
    pointerBloom.addEventListener("animationend", () => pointerBloom.remove(), { once: true });

    document.body.appendChild(pointerBloom);
  }

  function startPointerHold() {
    stopPointerHold();

    pointerState.holdIntervalId = window.setInterval(() => {
      if (pointerState.isPressing) {
        createPointerBloom(pointerState.x, pointerState.y);
      }
    }, TIMING.pointerHoldDelay);
  }

  function stopPointerHold() {
    window.clearInterval(pointerState.holdIntervalId);
    pointerState.holdIntervalId = null;
  }

  function schedulePointerHoldRestart() {
    window.clearTimeout(pointerState.holdRestartTimeoutId);

    pointerState.holdRestartTimeoutId = window.setTimeout(() => {
      if (pointerState.isPressing) {
        startPointerHold();
      }
    }, TIMING.pointerHoldRestartDelay);
  }

  function stopPointerBloom() {
    pointerState.isPressing = false;

    stopPointerHold();
    window.clearTimeout(pointerState.holdRestartTimeoutId);
    pointerState.holdRestartTimeoutId = null;
  }

  function handleInformationToggleClick() {
    toggleInformation();
  }

  function handleDocumentKeyDown(event) {
    if (event.key !== "Escape" || !isInformationOpen()) {
      return;
    }

    closeInformation();
    elements.informationToggle.focus();
  }

  function handleDocumentPointerDown(event) {
    const clickedInformation = getClosestEventTarget(event, SELECTORS.information);

    if (isInformationOpen() && !clickedInformation) {
      closeInformation();
    }

    if (isPointerExcluded(event)) {
      return;
    }

    pointerState.isPressing = true;
    pointerState.x = event.clientX;
    pointerState.y = event.clientY;

    createPointerBloom(pointerState.x, pointerState.y);
    startPointerHold();
  }

  function handleDocumentPointerMove(event) {
    if (!pointerState.isPressing) {
      return;
    }

    pointerState.x = event.clientX;
    pointerState.y = event.clientY;

    stopPointerHold();
    window.clearTimeout(pointerState.holdRestartTimeoutId);
    createPointerBloom(pointerState.x, pointerState.y);
    schedulePointerHoldRestart();
  }

  function initializeFooter() {
    elements.currentYear.textContent = new Date().getFullYear();
  }

  function bindEvents() {
    elements.informationToggle.addEventListener("click", handleInformationToggleClick);

    document.addEventListener("keydown", handleDocumentKeyDown);
    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("pointermove", handleDocumentPointerMove);
    document.addEventListener("pointerup", stopPointerBloom);
    document.addEventListener("pointercancel", stopPointerBloom);
  }

  function initialize() {
    initializeFooter();
    initializeMessage();
    updateInformationLinkOrder();
    observeInformationLinks();
    bindEvents();
  }

  initialize();
})();

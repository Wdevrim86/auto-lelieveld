(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const header = $("[data-header]");
  const menuButton = $(".menu-toggle");
  const menu = $("#main-nav");
  const bookingForm = $("#booking-form");
  const formMessage = $("[data-form-message]");
  const heroCta = $("[data-hero-cta]");
  const mobileActions = $("[data-mobile-actions]");
  const formExtras = $("[data-form-extras]");
  const copyRequestButton = $("[data-copy-request]");
  const liveBookingLink = $("[data-live-booking]");

  const bookingUrl = document.documentElement.dataset.bookingUrl?.trim();
  if (bookingUrl && liveBookingLink) {
    liveBookingLink.href = bookingUrl;
    liveBookingLink.hidden = false;
  }

  const closeMenu = () => {
    menu?.classList.remove("is-open");
    menuButton?.setAttribute("aria-expanded", "false");
    menuButton?.setAttribute("aria-label", "Menu openen");
    document.body.classList.remove("menu-open");
  };

  menuButton?.addEventListener("click", () => {
    const open = !menu?.classList.contains("is-open");
    menu?.classList.toggle("is-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Menu sluiten" : "Menu openen");
    document.body.classList.toggle("menu-open", open);
  });

  $$("a", menu).forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) closeMenu();
  });

  const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 20);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  if (heroCta && mobileActions && "IntersectionObserver" in window) {
    const heroCtaObserver = new IntersectionObserver(([entry]) => {
      const isMobile = window.matchMedia("(max-width: 620px)").matches;
      const hasPassedCta = !entry.isIntersecting && entry.boundingClientRect.bottom < 78;
      mobileActions.classList.toggle("is-visible", isMobile && hasPassedCta);
    }, { threshold: 0.1 });
    heroCtaObserver.observe(heroCta);
  }

  let mobileFormState;
  const syncFormExtras = () => {
    if (!formExtras) return;
    const isMobile = window.matchMedia("(max-width: 620px)").matches;
    if (isMobile === mobileFormState) return;
    formExtras.open = !isMobile;
    mobileFormState = isMobile;
  };
  syncFormExtras();
  window.addEventListener("resize", syncFormExtras);

  const amsterdamParts = () => Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Amsterdam",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date()).map(({ type, value }) => [type, value])
  );

  const updateOpeningStatus = () => {
    const node = $("[data-open-status]");
    if (!node) return;
    const { weekday, hour, minute } = amsterdamParts();
    const minutes = Number(hour) * 60 + Number(minute);
    const workday = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday);

    if (workday && minutes >= 480 && minutes < 1050) {
      node.textContent = "Nu open · tot 17:30";
    } else if (workday && minutes < 480) {
      node.textContent = "Vandaag open · 08:00–17:30";
    } else if (weekday === "Sat") {
      node.textContent = "Zaterdag · op afspraak";
    } else {
      node.textContent = "Nu gesloten · ma–vr 08:00–17:30";
    }
  };

  const { year, month, day } = amsterdamParts();
  const dateInput = bookingForm?.elements.date;
  if (dateInput) dateInput.min = `${year}-${month}-${day}`;
  updateOpeningStatus();

  const tabs = $$("[data-service-tab]");
  const serviceDetail = $(".service-detail");
  const serviceTitle = $("[data-service-title]");
  const serviceCopy = $("[data-service-copy]");
  const serviceAction = $("[data-service-action]");
  const serviceImage = $("[data-service-image]");

  const activateService = (tab) => {
    tabs.forEach((candidate) => {
      const selected = candidate === tab;
      candidate.setAttribute("aria-selected", String(selected));
      candidate.tabIndex = selected ? 0 : -1;
    });
    serviceDetail?.setAttribute("aria-labelledby", tab.id);
    serviceDetail?.classList.add("is-changing");
    window.setTimeout(() => {
      if (serviceTitle) serviceTitle.textContent = tab.dataset.title || "";
      if (serviceCopy) serviceCopy.textContent = tab.dataset.copy || "";
      if (serviceImage) {
        serviceImage.src = tab.dataset.image || serviceImage.src;
        serviceImage.alt = tab.dataset.imageAlt || "";
        serviceImage.style.objectPosition = tab.dataset.imagePosition || "center";
      }
      if (serviceAction) {
        serviceAction.childNodes[0].textContent = `${tab.dataset.action || "Afspraak aanvragen"} `;
        serviceAction.dataset.servicePrefill = tab.dataset.service || "";
      }
      serviceDetail?.classList.remove("is-changing");
    }, 150);
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateService(tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const visibleTabs = tabs.filter((candidate) => candidate.offsetParent !== null);
      const index = visibleTabs.indexOf(tab);
      let nextIndex = index;
      if (event.key === "ArrowDown") nextIndex = (index + 1) % visibleTabs.length;
      if (event.key === "ArrowUp") nextIndex = (index - 1 + visibleTabs.length) % visibleTabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = visibleTabs.length - 1;
      visibleTabs[nextIndex].focus();
      activateService(visibleTabs[nextIndex]);
    });
  });

  serviceAction?.addEventListener("click", () => {
    const select = bookingForm?.elements.service;
    if (select && serviceAction.dataset.servicePrefill) select.value = serviceAction.dataset.servicePrefill;
  });

  const formatPlate = (value) => {
    const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (raw.length < 6) return raw;
    const patterns = [
      [/^[A-Z]{2}\d{3}[A-Z]$/, [2, 3, 1]],
      [/^[A-Z]\d{3}[A-Z]{2}$/, [1, 3, 2]],
      [/^\d{2}[A-Z]{3}\d$/, [2, 3, 1]],
      [/^\d[A-Z]{3}\d{2}$/, [1, 3, 2]]
    ];
    const match = patterns.find(([pattern]) => pattern.test(raw));
    const groups = match ? match[1] : [2, 2, 2];
    let cursor = 0;
    return groups.map((length) => {
      const part = raw.slice(cursor, cursor + length);
      cursor += length;
      return part;
    }).join("-");
  };

  const plateInput = bookingForm?.elements.plate;
  plateInput?.addEventListener("input", () => {
    plateInput.value = formatPlate(plateInput.value);
  });

  const fields = bookingForm ? $$("input, select, textarea", bookingForm) : [];
  const errorMessages = {
    name: "Vul uw naam in.",
    phone: "Vul een telefoonnummer in waarop Dennis u kan bereiken.",
    service: "Kies waarmee Dennis u kan helpen.",
    email: "Controleer het e-mailadres, bijvoorbeeld naam@voorbeeld.nl."
  };

  const clearFieldError = (field) => {
    field.removeAttribute("aria-invalid");
    const error = $(`[data-error-for="${field.name}"]`, bookingForm);
    if (error) error.textContent = "";
  };

  const validateForm = () => {
    fields.forEach(clearFieldError);
    const invalidFields = fields.filter((field) => !field.checkValidity());
    invalidFields.forEach((field) => {
      field.setAttribute("aria-invalid", "true");
      const error = $(`[data-error-for="${field.name}"]`, bookingForm);
      if (error) error.textContent = errorMessages[field.name] || "Controleer dit veld.";
    });

    if (!invalidFields.length) return true;
    if (formExtras && invalidFields.some((field) => formExtras.contains(field))) formExtras.open = true;
    if (formMessage) formMessage.textContent = "Controleer de gemarkeerde velden en probeer het opnieuw.";
    invalidFields[0].focus();
    return false;
  };

  bookingForm?.addEventListener("input", (event) => {
    clearFieldError(event.target);
    if (formMessage) formMessage.textContent = "";
  });

  const buildRequest = () => {
    const data = new FormData(bookingForm);
    const dateValue = String(data.get("date") || "");
    const readableDate = dateValue
      ? new Intl.DateTimeFormat("nl-NL", { dateStyle: "long", timeZone: "Europe/Amsterdam" }).format(new Date(`${dateValue}T12:00:00`))
      : "in overleg";
    const subject = `Werkplaatsaanvraag — ${data.get("service")}`;
    const body = [
      "Beste Dennis,",
      "",
      "Graag vraag ik een werkplaatsafspraak aan.",
      "",
      `Naam: ${data.get("name")}`,
      `Telefoon: ${data.get("phone")}`,
      data.get("email") ? `E-mail: ${data.get("email")}` : null,
      data.get("plate") ? `Kenteken: ${data.get("plate")}` : null,
      `Werkzaamheden: ${data.get("service")}`,
      `Voorkeursdatum: ${readableDate}`,
      `Voorkeur dagdeel: ${data.get("dayPart") || "Geen voorkeur"}`,
      data.get("details") ? `Toelichting: ${data.get("details")}` : null,
      "",
      "Met vriendelijke groet,",
      String(data.get("name"))
    ].filter((line) => line !== null).join("\n");

    const mailto = `mailto:info@autolelieveld.nl?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return { subject, body, mailto };
  };

  bookingForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateForm()) return;
    const { mailto } = buildRequest();
    if (formMessage) formMessage.textContent = "Uw e-mailprogramma wordt geopend. Controleer de aanvraag en druk daar op verzenden.";
    window.setTimeout(() => { window.location.href = mailto; }, 120);
  });

  copyRequestButton?.addEventListener("click", async () => {
    if (!validateForm()) return;
    const { subject, body } = buildRequest();
    const requestText = `${subject}\n\n${body}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(requestText);
      } else {
        const temporary = document.createElement("textarea");
        temporary.value = requestText;
        temporary.setAttribute("readonly", "");
        temporary.style.position = "fixed";
        temporary.style.opacity = "0";
        document.body.appendChild(temporary);
        temporary.select();
        document.execCommand("copy");
        temporary.remove();
      }
      if (formMessage) formMessage.textContent = "De aanvraagtekst is gekopieerd. Plak hem in uw eigen e-mail en stuur die naar info@autolelieveld.nl.";
    } catch {
      if (formMessage) formMessage.textContent = "Kopiëren lukt niet. Mail naar info@autolelieveld.nl of bel 0174 752 762.";
    }
  });

  $("[data-year]").textContent = String(new Date().getFullYear());
})();

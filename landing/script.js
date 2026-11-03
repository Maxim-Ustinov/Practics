/* TenderScope landing — progressive enhancement only. */
(function () {
  "use strict";

  /* ------------------------------------------------------------------
     Header: shadow after scroll
     ------------------------------------------------------------------ */
  var header = document.querySelector("[data-header]");
  if (header) {
    var updateHeader = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
  }

  /* ------------------------------------------------------------------
     Mobile menu
     ------------------------------------------------------------------ */
  var menuToggle = document.querySelector("[data-menu-toggle]");
  var nav = document.querySelector("[data-nav]");

  if (menuToggle && nav) {
    var isMenuOpen = function () {
      return menuToggle.getAttribute("aria-expanded") === "true";
    };

    var setMenu = function (open) {
      nav.classList.toggle("is-open", open);
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
      document.body.classList.toggle("menu-open", open);
    };

    menuToggle.addEventListener("click", function () {
      setMenu(!isMenuOpen());
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        setMenu(false);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isMenuOpen()) {
        setMenu(false);
        menuToggle.focus();
      }
    });

    var desktopQuery = window.matchMedia("(min-width: 901px)");
    var onDesktop = function (event) {
      if (event.matches) setMenu(false);
    };
    if (typeof desktopQuery.addEventListener === "function") {
      desktopQuery.addEventListener("change", onDesktop);
    } else if (typeof desktopQuery.addListener === "function") {
      desktopQuery.addListener(onDesktop);
    }
  }

  /* ------------------------------------------------------------------
     Reveal on scroll (content is visible without JS)
     ------------------------------------------------------------------ */
  var revealItems = document.querySelectorAll(".reveal");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (revealItems.length) {
    if (!("IntersectionObserver" in window) || reducedMotion) {
      revealItems.forEach(function (item) {
        item.classList.add("is-visible");
      });
    } else {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
      );

      revealItems.forEach(function (item) {
        observer.observe(item);
      });
    }
  }

  /* ------------------------------------------------------------------
     Lead form → mailto:hello@tenderscope.ru
     ------------------------------------------------------------------ */
  var form = document.querySelector("[data-lead-form]");
  var successPanel = document.querySelector("[data-form-success]");

  if (form && successPanel) {
    var nameInput = form.querySelector("#lead-name");
    var contactInput = form.querySelector("#lead-contact");
    var consentInput = form.querySelector("#lead-consent");
    var submitButton = form.querySelector('button[type="submit"]');
    var retryLink = successPanel.querySelector("[data-mailto-retry]");
    var resetButton = successPanel.querySelector("[data-form-reset]");
    var successHeading = successPanel.querySelector("h3");

    var errorFor = function (key) {
      return form.querySelector('[data-error-for="' + key + '"]');
    };

    var showError = function (input, key, message) {
      var error = errorFor(key);
      if (error) {
        error.textContent = message;
        error.hidden = false;
      }
      if (input) input.setAttribute("aria-invalid", "true");
    };

    var clearError = function (input, key) {
      var error = errorFor(key);
      if (error) {
        error.textContent = "";
        error.hidden = true;
      }
      if (input) input.removeAttribute("aria-invalid");
    };

    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var telegramPattern = /^@[A-Za-z0-9_]{5,32}$/;

    var validate = function () {
      var valid = true;
      var name = nameInput.value.trim().replace(/\s+/g, " ");
      var contact = contactInput.value.trim();

      clearError(nameInput, "name");
      clearError(contactInput, "contact");
      clearError(consentInput, "consent");

      if (name.length < 2) {
        showError(nameInput, "name", "Укажите имя — минимум 2 символа.");
        valid = false;
      } else if (name.length > 80) {
        showError(nameInput, "name", "Имя слишком длинное — до 80 символов.");
        valid = false;
      }

      if (!contact) {
        showError(contactInput, "contact", "Укажите email или Telegram, чтобы мы могли ответить.");
        valid = false;
      } else if (contact.length > 254) {
        showError(contactInput, "contact", "Контакт слишком длинный.");
        valid = false;
      } else if (!emailPattern.test(contact) && !telegramPattern.test(contact)) {
        showError(
          contactInput,
          "contact",
          "Укажите email вида you@example.ru или Telegram-ник, начинающийся с @."
        );
        valid = false;
      }

      if (!consentInput.checked) {
        showError(
          consentInput,
          "consent",
          "Для отправки заявки нужно согласие на обработку персональных данных."
        );
        valid = false;
      }

      return valid;
    };

    var buildMailto = function () {
      var name = nameInput.value.trim().replace(/\s+/g, " ");
      var contact = contactInput.value.trim();
      var subject = "Заявка с сайта TenderScope — " + name;
      var body = [
        "Заявка с сайта TenderScope",
        "",
        "Имя: " + name,
        "Контакт: " + contact,
        "Согласие на обработку персональных данных: да",
        "Дата: " + new Date().toLocaleString("ru-RU"),
        "",
        "Пожалуйста, свяжитесь со мной по указанному контакту."
      ].join("\r\n");

      return (
        "mailto:hello@tenderscope.ru?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(body)
      );
    };

    var showSuccess = function (mailto) {
      if (retryLink) retryLink.setAttribute("href", mailto);
      form.hidden = true;
      successPanel.hidden = false;

      if (successHeading) {
        successHeading.setAttribute("tabindex", "-1");
        successHeading.focus({ preventScroll: true });
      }

      successPanel.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "nearest"
      });
    };

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!validate()) {
        var firstInvalid = form.querySelector('[aria-invalid="true"]');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      var mailto = buildMailto();
      showSuccess(mailto);
      window.location.href = mailto;
    });

    form.addEventListener("input", function (event) {
      var target = event.target;
      if (target === nameInput) clearError(nameInput, "name");
      if (target === contactInput) clearError(contactInput, "contact");
      if (target === consentInput) clearError(consentInput, "consent");
    });

    if (resetButton) {
      resetButton.addEventListener("click", function () {
        successPanel.hidden = true;
        form.hidden = false;
        if (submitButton) submitButton.focus();
        else nameInput.focus();
      });
    }
  }

  /* ------------------------------------------------------------------
     Footer year
     ------------------------------------------------------------------ */
  var yearNodes = document.querySelectorAll("[data-year]");
  var currentYear = String(new Date().getFullYear());
  yearNodes.forEach(function (node) {
    node.textContent = currentYear;
  });
})();

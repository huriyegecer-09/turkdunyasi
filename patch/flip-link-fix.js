(function (window, document) {
    "use strict";

    // The data file is intentionally separate so a new PDF export can be
    // patched without touching FlipBuilder's minified runtime.
    var config = window.FLIP_PDF_LINK_CONFIG || {};
    var links = window.FLIP_PDF_LINKS || [];
    var marker = "data-flip-link-fix-key";
    var installScheduled = false;

    function pageNumber(link) {
        var pdfPage = parseInt(link.pdfPage, 10);
        var offset = parseInt(config.pageOffset, 10);
        if (isNaN(offset)) {
            offset = 0;
        }
        if (link.flipPage !== undefined && link.flipPage !== null) {
            return parseInt(link.flipPage, 10);
        }
        return pdfPage + offset;
    }

    function pageElements(page) {
        if (!page || page < 1) {
            return [];
        }
        var result = [];
        var nodes = document.querySelectorAll('[id="page' + page + '"]');
        for (var i = 0; i < nodes.length; i += 1) {
            result.push(nodes[i]);
        }
        return result;
    }

    function hostFor(page) {
        return page.querySelector(".side-content") ||
            page.querySelector(".page-content") || page;
    }

    function keyFor(link) {
        return String(pageNumber(link)) + "|" + String(link.href) + "|" +
            [link.leftPct, link.topPct, link.widthPct, link.heightPct].join(",");
    }

    function visible(element) {
        if (!element || !element.getBoundingClientRect) {
            return false;
        }
        var style = window.getComputedStyle(element);
        var rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" &&
            parseFloat(style.opacity || "1") !== 0 && rect.width > 0 && rect.height > 0;
    }

    function matchesPosition(element, host, link) {
        if (!visible(element) || !host || !host.getBoundingClientRect) {
            return false;
        }
        var hostRect = host.getBoundingClientRect();
        if (!hostRect.width || !hostRect.height) {
            return false;
        }
        var rect = element.getBoundingClientRect();
        var left = (rect.left - hostRect.left) / hostRect.width * 100;
        var top = (rect.top - hostRect.top) / hostRect.height * 100;
        var width = rect.width / hostRect.width * 100;
        var height = rect.height / hostRect.height * 100;
        return Math.abs(left - Number(link.leftPct)) < 1.5 &&
            Math.abs(top - Number(link.topPct)) < 1.5 &&
            Math.abs(width - Number(link.widthPct)) < 1.5 &&
            Math.abs(height - Number(link.heightPct)) < 1.5;
    }

    function hasExistingLink(host, link) {
        var anchors = host.querySelectorAll("a[href]");
        for (var i = 0; i < anchors.length; i += 1) {
            var rawHref = anchors[i].getAttribute("href");
            if (rawHref === link.href || anchors[i].href === link.href) {
                return true;
            }
        }

        // Native PageItem.Link objects are divs rather than anchors. Avoid a
        // duplicate when the Flip runtime has already rendered the rectangle.
        var nativeItems = host.querySelectorAll(".expose-square-solid");
        for (var j = 0; j < nativeItems.length; j += 1) {
            if (matchesPosition(nativeItems[j], host, link)) {
                return true;
            }
        }
        return false;
    }

    function labelFor(link) {
        if (link.label) {
            return link.label;
        }
        if (String(link.href).indexOf("/sirvansahlar-sarayi/") !== -1) {
            return "Şirvanşahlar Sarayı";
        }
        var parts = String(link.href || "").split("/");
        for (var i = parts.length - 1; i >= 0; i -= 1) {
            if (parts[i]) {
                return parts[i].replace(/[-_]+/g, " ");
            }
        }
        return "PDF bağlantısını aç";
    }

    function install(link, page) {
        var host = hostFor(page);
        if (!host || !link.href) {
            return;
        }
        var key = keyFor(link);
        if (host.querySelector('[' + marker + '="' +
                key.replace(/"/g, "&quot;") + '"]')) {
            return;
        }
        if (hasExistingLink(host, link)) {
            return;
        }

        // FlipBuilder normally supplies a positioned .side-content. Keep a
        // fallback for exports whose page host is statically positioned.
        if (window.getComputedStyle(host).position === "static") {
            host.style.position = "relative";
        }

        var anchor = document.createElement("a");
        anchor.className = "custom-pdf-link";
        anchor.setAttribute(marker, key);
        anchor.setAttribute("href", link.href);
        anchor.setAttribute("target", "_blank");
        anchor.setAttribute("rel", "noopener noreferrer");
        anchor.setAttribute("aria-label", labelFor(link) + " bağlantısını aç");
        anchor.style.left = Number(link.leftPct) + "%";
        anchor.style.top = Number(link.topPct) + "%";
        anchor.style.width = Number(link.widthPct) + "%";
        anchor.style.height = Number(link.heightPct) + "%";
        host.appendChild(anchor);
    }

    function installAll() {
        for (var i = 0; i < links.length; i += 1) {
            var pages = pageElements(pageNumber(links[i]));
            for (var j = 0; j < pages.length; j += 1) {
                install(links[i], pages[j]);
            }
        }
    }

    function scheduleInstall() {
        if (installScheduled) {
            return;
        }
        installScheduled = true;
        window.setTimeout(function () {
            installScheduled = false;
            installAll();
        }, 50);
    }

    function start() {
        installAll();
        if (window.MutationObserver) {
            var root = document.getElementById("bookContainer") || document.body;
            new MutationObserver(scheduleInstall).observe(root, {
                childList: true,
                subtree: true
            });
        }
        window.setTimeout(installAll, 250);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
}(window, document));

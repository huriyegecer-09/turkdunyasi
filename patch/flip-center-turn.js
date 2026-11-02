(function () {
  'use strict';

  // Corner gestures are intentionally disabled. A page turn can still start
  // from the middle of the book, which avoids the folded top/bottom corners.
  var cornerRatio = 0.18;

  function pointFromEvent(event) {
    var touch = event.touches && event.touches[0] ||
      event.changedTouches && event.changedTouches[0];
    return touch || event;
  }

  function isBookCorner(event) {
    var book = document.getElementById('flipBook');
    if (!book) {
      var candidates = document.querySelectorAll('.bookContainer > .book');
      for (var i = 0; i < candidates.length; i += 1) {
        var candidate = candidates[i];
        var candidateRect = candidate.getBoundingClientRect();
        if (getComputedStyle(candidate).display !== 'none' &&
            candidateRect.width && candidateRect.height) {
          book = candidate;
          break;
        }
      }
    }
    if (!book) return false;

    var point = pointFromEvent(event);
    if (typeof point.clientX !== 'number' || typeof point.clientY !== 'number') {
      return false;
    }

    var rect = book.getBoundingClientRect();
    if (!rect.width || !rect.height ||
        point.clientX < rect.left || point.clientX > rect.right ||
        point.clientY < rect.top || point.clientY > rect.bottom) {
      return false;
    }

    var depthX = rect.width * cornerRatio;
    var depthY = rect.height * cornerRatio;
    var inTopOrBottom = point.clientY <= rect.top + depthY ||
      point.clientY >= rect.bottom - depthY;
    var inLeftOrRight = point.clientX <= rect.left + depthX ||
      point.clientX >= rect.right - depthX;
    return inTopOrBottom && inLeftOrRight;
  }

  function blockCornerGesture(event) {
    if (isBookCorner(event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  document.addEventListener('pointerdown', blockCornerGesture, true);
  document.addEventListener('mousedown', blockCornerGesture, true);
  document.addEventListener('touchstart', blockCornerGesture, true);
}());

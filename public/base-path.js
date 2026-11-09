(function configureBasePath() {
    const staticMarker = '/static/';
    const markerIndex = window.location.pathname.indexOf(staticMarker);

    window.BASE_PATH = markerIndex > 0
        ? window.location.pathname.slice(0, markerIndex)
        : '';
})();

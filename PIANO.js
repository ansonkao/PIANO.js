var PIANO = function(a) {
    return a.config = a.config || {}, a.config.keyboard_range = 88, a.config.xy_flip = !1, 
    a.fn = {}, a.fn.closestHalfPixel = function(a) {
        return parseInt(.5 + a) - .5;
    }, a.fn.isDomElement = function(a) {
        return "object" == typeof HTMLElement ? a instanceof HTMLElement : a && "object" == typeof a && null !== a && 1 === a.nodeType && "string" == typeof a.nodeName;
    }, CanvasRenderingContext2D.prototype.drawLine = function(b, c, d, e) {
        a.config.xy_flip && (b = [ c, c = b ][0], d = [ e, e = d ][0]), this.moveTo(b, c), 
        this.lineTo(d, e);
    }, a.sequencer = {}, a.sequencer.timeRange = function() {
        return a.sequencer.timeStop - a.sequencer.timeStart;
    }, a.sequencer.noteRange = function() {
        return a.sequencer.noteStop - a.sequencer.noteStart;
    }, a.sequencer.percent2note = function(b) {
        return Math.ceil(b * a.config.keyboard_range);
    }, a.init = function(b) {
        return console.debug("PIANO.init()"), a.fn.isDomElement(b) ? (a.sequencer.wrapper = b, 
        a.sequencer.wrapper.className = "piano-wrapper", a.sequencer.el = a.sequencer.wrapper.appendChild(document.createElement("canvas")), 
        a.sequencer.canvas = a.sequencer.el.getContext("2d"), a.sequencer.scrollX = a.sequencer.wrapper.appendChild(document.createElement("div")), 
        a.sequencer.scrollY = a.sequencer.wrapper.appendChild(document.createElement("div")), 
        a.sequencer.scrollX.className = "scroll x", a.sequencer.scrollY.className = "scroll y", 
        a.sequencer.scrollBarX = a.sequencer.scrollX.appendChild(document.createElement("div")), 
        a.sequencer.scrollBarY = a.sequencer.scrollY.appendChild(document.createElement("div")), 
        a.sequencer.scrollBarX.className = "bar x", a.sequencer.scrollBarY.className = "bar y", 
        void a.render.launch()) : void console.error("PIANO.init() FAILED - Invalid starting DOM element.");
    }, a.render = {}, a.render.launch = function() {
        console.debug("PIANO.render.launch()"), a.render.reset(0, 1, .5, .75), a.render.background(), 
        a.render.note_scale(), a.render.paint();
    }, a.render.reset = function(b, c, d, e) {
        console.debug("PIANO.render.reset()"), a.sequencer.el.width = a.sequencer.width = a.sequencer.wrapper.clientWidth - 20, 
        a.sequencer.el.height = a.sequencer.height = a.sequencer.wrapper.clientHeight - 20, 
        a.sequencer.el.style.width = a.sequencer.width + "px", a.sequencer.el.style.height = a.sequencer.height + "px", 
        a.sequencer.timeStart = b, a.sequencer.timeStop = c, a.sequencer.noteStart = d, 
        a.sequencer.noteStop = e;
    }, a.render.background = function() {
        console.debug("PIANO.render.background()"), a.sequencer.canvas.fillStyle = "#EEEEEE", 
        a.sequencer.canvas.fillRect(0, 0, a.sequencer.width, a.sequencer.height);
    }, a.render.note_scale = function() {
        console.debug("PIANO.render.note_scale()"), a.sequencer.canvas.lineWidth = 1, a.sequencer.canvas.strokeStyle = "#D4D4D4", 
        a.sequencer.canvas.fillStyle = "#DDDDDD";
        for (var b = a.sequencer.percent2note(a.sequencer.noteStart); b <= a.sequencer.percent2note(a.sequencer.noteStop); b++) {
            var c = a.fn.closestHalfPixel(((b - 1) / a.config.keyboard_range - a.sequencer.noteStart) / a.sequencer.noteRange() * a.sequencer.height), d = a.fn.closestHalfPixel((b / a.config.keyboard_range - a.sequencer.noteStart) / a.sequencer.noteRange() * a.sequencer.height);
            switch (c > .5 && a.sequencer.canvas.drawLine(0, c, a.sequencer.width, c), b % 12) {
              case 3:
              case 5:
              case 7:
              case 10:
              case 0:
                a.sequencer.canvas.fillRect(0, d, a.sequencer.width, c - d);
            }
        }
    }, a.render.paint = function() {
        console.debug("PIANO.render.paint()"), a.sequencer.canvas.stroke();
    }, a;
}(PIANO || {});

PIANO.init(document.getElementById("target"));
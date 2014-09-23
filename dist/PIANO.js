var PIANO = function() {
    function a(a) {
        this.canvas = a.appendChild(document.createElement("canvas")), this.canvas.className = "piano-canvas", 
        this.canvasContext = this.canvas.getContext("2d"), this.keyboardRange = 88, this.clipLength = this.width = null, 
        this.height = null, this.timeScale = {
            min: 0,
            max: 1
        }, this.noteScale = {
            min: .5,
            max: 1
        }, this.getTimeRange = function() {
            return this.timeScale.max - this.timeScale.min;
        }, this.getNoteRange = function() {
            return this.noteScale.max - this.noteScale.min;
        }, this.percentToNote = function(a) {
            return Math.ceil(a * this.keyboardRange);
        }, this.init = function() {
            this.canvas.width = this.width = a.clientWidth, this.canvas.height = this.height = a.clientHeight, 
            this.canvasContext.clear(), this.canvasContext.backgroundFill("#EEEEEE"), this.renderNoteScale();
        }, this.renderNoteScale = function() {
            this.canvasContext.lineWidth = 1, this.canvasContext.strokeStyle = "#D4D4D4", this.canvasContext.fillStyle = "#DDDDDD";
            for (var a = this.percentToNote(this.noteScale.min); a <= this.percentToNote(this.noteScale.max); a++) {
                var b = Math.closestHalfPixel(((a - 1) / this.keyboardRange - this.noteScale.min) / this.getNoteRange() * this.height), c = Math.closestHalfPixel((a / this.keyboardRange - this.noteScale.min) / this.getNoteRange() * this.height);
                b > .5 && this.canvasContext.drawLine(0, b, this.width, b, this.xyFlip), a % 12 in {
                    3: !0,
                    5: !0,
                    7: !0,
                    10: !0,
                    0: !0
                } && this.canvasContext.fillRect(0, c, this.width, b - c);
            }
            this.canvasContext.stroke();
        };
        var b = this;
        b.init(), b.init(), a.addEventListener("gripscroll-update", function(a) {
            switch (a.direction) {
              case "x":
                b.timeScale.min = a.min, b.timeScale.max = a.max;
                break;

              case "y":
                b.noteScale.min = a.min, b.noteScale.max = a.max;
            }
            b.init();
        });
    }
    var b = [], c = [], d = function(d, e) {
        for (var f = 0; f < b.length; f++) if (b[f] == d) return;
        b.push(d), c.push({
            x: new a(d, e),
            y: new a(d, e)
        });
    };
    return {
        add: d
    };
}();

Math.closestHalfPixel = Math.closestHalfPixel || function(a) {
    return parseInt(.5 + a) - .5;
}, CanvasRenderingContext2D.prototype.drawLine = CanvasRenderingContext2D.prototype.drawLine || function(a, b, c, d, e) {
    e && (a = [ b, b = a ][0], c = [ d, d = c ][0]), this.moveTo(a, b), this.lineTo(c, d);
}, CanvasRenderingContext2D.prototype.backgroundFill = CanvasRenderingContext2D.prototype.backgroundFill || function(a) {
    this.fillStyle = a, this.fillRect(0, 0, this.canvas.width, this.canvas.height);
};
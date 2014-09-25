var PIANO = function() {
    function a(a, b) {
        this.canvas = a.appendChild(document.createElement("canvas")), this.canvas.className = "piano-canvas", 
        this.canvasContext = this.canvas.getContext("2d"), this.keyboardSize = 88, this.clipLength = 64, 
        this.width = null, this.height = null, this.timeScale = {
            min: .5,
            max: 1
        }, this.keyScale = {
            min: 0,
            max: 1
        }, this.notes = b.notes || [], this.hoveredNotes = [], this.isDragging = !1, this.isHovering = !1, 
        this.getTimeRange = function() {
            return this.timeScale.max - this.timeScale.min;
        }, this.getKeyRange = function() {
            return this.keyScale.max - this.keyScale.min;
        }, this.percentToKey = function(a) {
            return Math.ceil(a * this.keyboardSize);
        }, this.percentToBar = function(a) {
            return Math.ceil(a * this.clipLength);
        }, this.barToPixels = function(a) {
            return a / this.clipLength / this.getTimeRange() * this.width;
        }, this.keyToPixels = function(a) {
            return a / this.keyboardSize / this.getKeyRange() * this.height;
        }, this.barToXCoord = function(a) {
            return (a / this.clipLength - this.timeScale.min) / this.getTimeRange() * this.width;
        }, this.keyToYCoord = function(a) {
            return (a / this.keyboardSize - this.keyScale.min) / this.getKeyRange() * this.height;
        }, this.xCoordToBar = function(a) {
            return (a / this.width * this.getTimeRange() + this.timeScale.min) * this.clipLength;
        }, this.yCoordToKey = function(a) {
            return (1 - (a / this.height * this.getKeyRange() + this.keyScale.min)) * this.keyboardSize;
        }, this.getHoveredNote = function(a, b) {
            for (var c = 0; c < this.notes.length; c++) if (a >= this.notes[c].position && a <= this.notes[c].position + this.notes[c].length && this.notes[c].key - b < 1 && this.notes[c].key - b > 0) return this.notes[c];
            return null;
        }, this.getHoverAction = function(a, b) {
            return b ? this.barToPixels(b.length) < 8 ? "mid" : this.barToPixels(a - b.position) < 4 ? "min" : this.barToPixels(b.position + b.length - a) < 4 ? "max" : "mid" : null;
        }, this.init = function() {
            this.canvas.width = this.width = a.clientWidth, this.canvas.height = this.height = a.clientHeight;
        }, this.renderAll = function() {
            this.canvasContext.clear(), this.canvasContext.backgroundFill("#EEEEEE"), this.renderKeyScale(), 
            this.renderTimeScale(), this.renderNotes(this.notes);
        }, this.renderKeyScale = function() {
            this.canvasContext.lineWidth = 1, this.canvasContext.strokeStyle = "#D4D4E0", this.canvasContext.fillStyle = "#DDDDE4";
            for (var a = this.percentToKey(this.keyScale.min); a <= this.percentToKey(this.keyScale.max); a++) {
                var b = Math.closestHalfPixel(this.keyToYCoord(a - 1)), c = Math.closestHalfPixel(this.keyToYCoord(a));
                b > .5 && this.canvasContext.drawLine(0, b, this.width, b, this.xyFlip), a % 12 in {
                    3: !0,
                    5: !0,
                    7: !0,
                    10: !0,
                    0: !0
                } && this.canvasContext.fillRect(0, c, this.width, b - c);
            }
            this.canvasContext.stroke();
        }, this.renderTimeScale = function() {
            this.canvasContext.lineWidth = 1;
            for (var a = this.percentToBar(this.timeScale.min) - 1; a < this.percentToBar(this.timeScale.max); a += .25) {
                this.canvasContext.beginPath(), this.canvasContext.strokeStyle = a % 1 ? "#CCD" : "#AAB";
                var b = Math.closestHalfPixel(this.barToXCoord(a));
                this.canvasContext.drawLine(b, 0, b, this.height), this.canvasContext.stroke();
            }
        }, this.renderNotes = function(a) {
            this.canvasContext.beginPath(), this.canvasContext.lineWidth = 1, this.canvasContext.strokeStyle = "#812", 
            this.canvasContext.fillStyle = "#F24";
            for (var b = 0; b < a.length; b++) this.hoveredNotes.indexOf(a[b]) >= 0 || this.renderSingleNote(a[b]);
            this.canvasContext.stroke(), this.canvasContext.beginPath(), this.canvasContext.lineWidth = 1, 
            this.canvasContext.strokeStyle = "#401", this.canvasContext.fillStyle = "#812";
            for (var c = 0; c < this.hoveredNotes.length; c++) this.renderSingleNote(this.hoveredNotes[c]);
            this.canvasContext.stroke();
        }, this.renderSingleNote = function(a) {
            var b = Math.closestHalfPixel(this.barToXCoord(a.position)), c = Math.closestHalfPixel(this.barToXCoord(a.position + a.length)), d = Math.closestHalfPixel(this.keyToYCoord(this.keyboardSize - a.key)), e = Math.closestHalfPixel(this.keyToYCoord(this.keyboardSize - a.key + 1));
            this.canvasContext.fillRect(b + 1, d + 2, c - b - 3, e - d - 4), this.canvasContext.strokeRect(b + 0, d + 1, c - b - 1, e - d - 2);
        }, this.renderSelectionBox = function(a, b) {
            this.canvasContext.beginPath(), this.canvasContext.lineWidth = 1, this.canvasContext.strokeStyle = "#000", 
            this.canvasContext.setLineDash([ 2, 4 ]), this.canvasContext.strokeRect(Math.closestHalfPixel(a.clientX - this.canvas.clientXYDirectional("x")), Math.closestHalfPixel(a.clientY - this.canvas.clientXYDirectional("y")), Math.round(b.clientX - a.clientX), Math.round(b.clientY - a.clientY)), 
            this.canvasContext.stroke(), this.canvasContext.setLineDash([]);
        };
        var c = this;
        c.init(), window.addEventListener("resize", function() {
            c.init();
        }), a.addEventListener("gripscroll-update", function(a) {
            switch (a.direction) {
              case "x":
                c.timeScale.min = a.min, c.timeScale.max = a.max;
                break;

              case "y":
                c.keyScale.min = a.min, c.keyScale.max = a.max;
            }
            c.renderAll();
        });
        var d = null, e = function(a) {
            c.isDragging = !0, d = a;
        }, f = function(a) {
            c.renderAll(), c.renderSelectionBox(d, a);
        }, g = function() {
            c.isDragging = !1, c.renderAll();
        };
        DragKing.addHandler(c.canvas, e, f, g);
        var h = function() {
            c.isHovering = !0;
        }, i = function(a) {
            var b = c.xCoordToBar(a.clientX - c.canvas.clientXYDirectional("x")), d = c.yCoordToKey(a.clientY - c.canvas.clientXYDirectional("y")), e = c.getHoveredNote(b, d), f = c.getHoverAction(b, e);
            c.hoveredNotes = e ? [ e ] : [], c.renderAll();
            var g = null;
            switch (f) {
              case "min":
                g = "xresize";
                break;

              case "max":
                g = "xresize";
                break;

              case "mid":
                g = "grab";
                break;

              default:
                g = "default";
            }
            return g;
        }, j = function() {
            c.hoveredNotes = [], c.renderAll();
        };
        CurseWords.addImplicitCursorHandler(c.canvas, h, i, j);
    }
    var b = [], c = [], d = function(d, e) {
        for (var f = 0; f < b.length; f++) if (b[f] == d) return;
        b.push(d), c.push(new a(d, e));
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
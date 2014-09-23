var PIANO = function() {
    function a(a) {
        this.canvas = a.appendChild(document.createElement("canvas")), this.canvas.className = "piano-canvas", 
        this.canvasContext = this.canvas.getContext("2d"), this.keyboardRange = 25, this.clipLength = 4, 
        this.width = null, this.height = null, this.timeScale = {
            min: 0,
            max: 1
        }, this.keyScale = {
            min: .5,
            max: 1
        }, this.getTimeRange = function() {
            return this.timeScale.max - this.timeScale.min;
        }, this.getKeyRange = function() {
            return this.keyScale.max - this.keyScale.min;
        }, this.percentToKey = function(a) {
            return Math.ceil(a * this.keyboardRange);
        }, this.percentToBar = function(a) {
            return Math.ceil(a * this.clipLength);
        }, this.init = function() {
            this.canvas.width = this.width = a.clientWidth, this.canvas.height = this.height = a.clientHeight;
            var b = [ {
                key: 10,
                position: 0,
                length: .5
            }, {
                key: 14,
                position: .25,
                length: 1
            }, {
                key: 17,
                position: .5,
                length: .75
            }, {
                key: 22,
                position: .75,
                length: .5
            }, {
                key: 24,
                position: 1,
                length: .25
            }, {
                key: 22,
                position: 1.25,
                length: .25
            } ];
            this.canvasContext.clear(), this.canvasContext.backgroundFill("#EEEEEE"), this.renderKeyScale(), 
            this.renderTimeScale(), this.renderNotes(b);
        }, this.renderKeyScale = function() {
            this.canvasContext.lineWidth = 1, this.canvasContext.strokeStyle = "#D4D4E0", this.canvasContext.fillStyle = "#DDDDE4";
            for (var a = this.percentToKey(this.keyScale.min); a <= this.percentToKey(this.keyScale.max); a++) {
                var b = Math.closestHalfPixel(((a - 1) / this.keyboardRange - this.keyScale.min) / this.getKeyRange() * this.height), c = Math.closestHalfPixel((a / this.keyboardRange - this.keyScale.min) / this.getKeyRange() * this.height);
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
            for (var a = this.percentToBar(this.timeScale.min) - 1; a <= this.percentToBar(this.timeScale.max); a += .25) {
                this.canvasContext.beginPath(), this.canvasContext.strokeStyle = a % 1 ? "#CCD" : "#AAB";
                var b = Math.closestHalfPixel((a / this.clipLength - this.timeScale.min) / this.getTimeRange() * this.width);
                this.canvasContext.drawLine(b, 0, b, this.height), this.canvasContext.stroke();
            }
        }, this.renderNotes = function(a) {
            this.canvasContext.lineWidth = 1, this.canvasContext.strokeStyle = "#812", this.canvasContext.fillStyle = "#F24";
            for (var b = 0; b < a.length; b++) {
                var c = Math.closestHalfPixel((a[b].position / this.clipLength - this.timeScale.min) / this.getTimeRange() * this.width), d = Math.closestHalfPixel((a[b].key / this.keyboardRange - this.keyScale.min) / this.getKeyRange() * this.height), e = Math.closestHalfPixel(((a[b].position + a[b].length) / this.clipLength - this.timeScale.min) / this.getTimeRange() * this.width), f = Math.closestHalfPixel(((a[b].key + 1) / this.keyboardRange - this.keyScale.min) / this.getKeyRange() * this.height);
                this.canvasContext.fillRect(c + 1, d + 2, e - c - 3, f - d - 4), this.canvasContext.strokeRect(c + 0, d + 1, e - c - 1, f - d - 2);
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
                b.keyScale.min = a.min, b.keyScale.max = a.max;
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
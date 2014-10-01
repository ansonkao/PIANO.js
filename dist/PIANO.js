var PIANO = function() {
    function a(a, b) {
        this.container = a, this.canvas = a.appendChild(document.createElement("canvas")), 
        this.canvas.className = "piano-canvas", this.canvasContext = this.canvas.getContext("2d"), 
        this.keyboardSize = 88, this.clipLength = 64, this.width = null, this.height = null, 
        this.timeScale = {
            min: .5,
            max: 1
        }, this.keyScale = {
            min: 0,
            max: 1
        }, this.notes = {}, this.notes.saved = b.notes || [], this.notes.active = [], this.isDragging = !1, 
        this.isHovering = !1;
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
            c.renderFreshGrid(), c.renderNotes();
        });
        var d = null, e = function(a) {
            d = a;
            var b = c.xCoordToBar(a.clientX - c.canvas.clientXYDirectional("x")), e = c.yCoordToKey(a.clientY - c.canvas.clientXYDirectional("y")), f = c.getHoveredNote(b, e);
            c.isDragging = c.getHoverAction(b, f), c.setActiveNotes(f);
        }, f = function(a) {
            "mid" == c.isDragging ? (c.renderFreshGrid(), c.renderNotes({
                startDelta: c.pixelsToBar(a.clientX - d.clientX),
                keyDelta: c.pixelsToKey(a.clientY - d.clientY)
            })) : (c.renderFreshGrid(), c.renderNotes(), c.renderSelectionBox(d, a));
        }, g = function(a) {
            "mid" == c.isDragging && c.applyChangesToActiveNotes({
                startDelta: c.pixelsToBar(a.clientX - d.clientX),
                keyDelta: c.pixelsToKey(a.clientY - d.clientY)
            }), c.isDragging = !1, c.renderFreshGrid(), c.renderNotes();
        };
        DragKing.addHandler(c.canvas, e, f, g);
        var h = function() {
            c.isHovering = !0;
        }, i = function(a) {
            if (c.isDragging) return null;
            var b = c.xCoordToBar(a.clientX - c.canvas.clientXYDirectional("x")), d = c.yCoordToKey(a.clientY - c.canvas.clientXYDirectional("y")), e = c.getHoveredNote(b, d), f = c.getHoverAction(b, e);
            c.renderFreshGrid(), c.renderNotes();
            var g = null;
            switch (f) {
              case "min":
                g = "xresize";
                break;

              case "max":
                g = "xresize";
                break;

              case "mid":
                g = "move";
                break;

              default:
                g = "default";
            }
            return g;
        }, j = function() {
            c.renderFreshGrid(), c.renderNotes();
        };
        CurseWords.addImplicitCursorHandler(c.canvas, h, i, j);
    }
    var b = [], c = [], d = function(d, e) {
        for (var f = 0; f < b.length; f++) if (b[f] == d) return;
        b.push(d), c.push(new a(d, e));
    };
    return a.prototype.getTimeRange = function() {
        return this.timeScale.max - this.timeScale.min;
    }, a.prototype.getKeyRange = function() {
        return this.keyScale.max - this.keyScale.min;
    }, a.prototype.percentToKey = function(a) {
        return Math.ceil(a * this.keyboardSize);
    }, a.prototype.percentToBar = function(a) {
        return Math.ceil(a * this.clipLength);
    }, a.prototype.barToPixels = function(a) {
        return a / this.clipLength / this.getTimeRange() * this.width;
    }, a.prototype.keyToPixels = function(a) {
        return a / this.keyboardSize / this.getKeyRange() * this.height;
    }, a.prototype.barToXCoord = function(a) {
        return (a / this.clipLength - this.timeScale.min) / this.getTimeRange() * this.width;
    }, a.prototype.keyToYCoord = function(a) {
        return (a / this.keyboardSize - this.keyScale.min) / this.getKeyRange() * this.height;
    }, a.prototype.pixelsToBar = function(a) {
        return a / this.width * this.getTimeRange() * this.clipLength;
    }, a.prototype.pixelsToKey = function(a) {
        return (0 - a / this.height * this.getKeyRange()) * this.keyboardSize;
    }, a.prototype.xCoordToBar = function(a) {
        return (a / this.width * this.getTimeRange() + this.timeScale.min) * this.clipLength;
    }, a.prototype.yCoordToKey = function(a) {
        return (1 - (a / this.height * this.getKeyRange() + this.keyScale.min)) * this.keyboardSize;
    }, a.prototype.getHoveredNote = function(a, b) {
        for (var c = this.notes.saved.concat(this.notes.active), d = 0; d < c.length; d++) if (a >= c[d].start && a <= c[d].start + c[d].length && c[d].key - b < 1 && c[d].key - b > 0) return c[d];
        return null;
    }, a.prototype.getHoverAction = function(a, b) {
        return b ? this.barToPixels(b.length) < 15 ? "mid" : this.barToPixels(a - b.start) < 4 ? "min" : this.barToPixels(b.start + b.length - a) < 4 ? "max" : "mid" : "select";
    }, a.prototype.setActiveNotes = function(a, b) {
        if (!a) return void this.clearActiveNotes();
        b || this.clearActiveNotes(), Array.isArray(a) || (a = [ a ]), this.notes.active = this.notes.active.concat(a);
        for (var c = 0; c < a.length; c++) this.notes.saved.splice(this.notes.saved.indexOf(a[c]), 1);
    }, a.prototype.clearActiveNotes = function() {
        this.notes.saved = this.notes.saved.concat(this.notes.active), this.notes.active = [];
    }, a.prototype.applyChangesToActiveNotes = function(a) {
        if (a) for (var b = 0; b < this.notes.active.length; b++) a.startDelta && (this.notes.active[b].start += a.startDelta), 
        a.keyDelta && (this.notes.active[b].key += a.keyDelta), a.lengthDelta && (this.notes.active[b].length += a.lengthDelta), 
        this.quantizeNote(this.notes.active[b]);
    }, a.prototype.quantizeNote = function(a) {
        return a.key = Math.round(a.key), a.start = .125 * Math.round(8 * a.start), a.length = .125 * Math.round(8 * a.length), 
        a;
    }, a.prototype.init = function() {
        this.canvas.width = this.width = this.container.clientWidth, this.canvas.height = this.height = this.container.clientHeight;
    }, a.prototype.renderFreshGrid = function() {
        this.canvasContext.clear(), this.canvasContext.backgroundFill("#EEEEEE"), this.renderKeyScale(), 
        this.renderTimeScale();
    }, a.prototype.renderKeyScale = function() {
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
    }, a.prototype.renderTimeScale = function() {
        this.canvasContext.lineWidth = 1;
        for (var a = this.percentToBar(this.timeScale.min) - 1; a < this.percentToBar(this.timeScale.max); a += .25) {
            this.canvasContext.beginPath(), this.canvasContext.strokeStyle = a % 1 ? "#CCD" : "#AAB";
            var b = Math.closestHalfPixel(this.barToXCoord(a));
            this.canvasContext.drawLine(b, 0, b, this.height), this.canvasContext.stroke();
        }
    }, a.prototype.renderNotes = function(a) {
        this.canvasContext.beginPath(), this.canvasContext.lineWidth = 1, this.canvasContext.strokeStyle = "#812", 
        this.canvasContext.fillStyle = "#F24";
        for (var b = 0; b < this.notes.saved.length; b++) this.renderSingleNote(this.notes.saved[b]);
        this.canvasContext.stroke(), this.canvasContext.beginPath(), this.canvasContext.lineWidth = 1, 
        this.canvasContext.strokeStyle = "#401", this.canvasContext.fillStyle = "#812";
        for (var c = 0; c < this.notes.active.length; c++) {
            var d = a && a.startDelta || 0, e = a && a.keyDelta || 0, f = this.quantizeNote({
                key: this.notes.active[c].key + e,
                start: this.notes.active[c].start + d,
                length: this.notes.active[c].length
            });
            this.renderSingleNote(f);
        }
        this.canvasContext.stroke();
    }, a.prototype.renderSingleNote = function(a) {
        var b = Math.closestHalfPixel(this.barToXCoord(a.start)), c = Math.closestHalfPixel(this.barToXCoord(a.start + a.length)), d = Math.closestHalfPixel(this.keyToYCoord(this.keyboardSize - a.key)), e = Math.closestHalfPixel(this.keyToYCoord(this.keyboardSize - a.key + 1));
        this.canvasContext.fillRect(b + 1, d + 2, c - b - 3, e - d - 4), this.canvasContext.strokeRect(b + 0, d + 1, c - b - 1, e - d - 2);
    }, a.prototype.renderSelectionBox = function(a, b) {
        this.canvasContext.beginPath(), this.canvasContext.lineWidth = 1, this.canvasContext.strokeStyle = "#000", 
        this.canvasContext.setLineDash([ 2, 4 ]), this.canvasContext.strokeRect(Math.closestHalfPixel(a.clientX - this.canvas.clientXYDirectional("x")), Math.closestHalfPixel(a.clientY - this.canvas.clientXYDirectional("y")), Math.round(b.clientX - a.clientX), Math.round(b.clientY - a.clientY)), 
        this.canvasContext.stroke(), this.canvasContext.setLineDash([]);
    }, {
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

var CurseWords = function() {
    var a = null, b = 0, c = [], d = [], e = [], f = [], g = "default", h = null, i = document.getElementsByTagName("body")[0], j = function(a, g, h, i) {
        c[b] = a, d[b] = g, e[b] = h, f[b] = i, b++;
    }, k = function(a) {
        h = a, m();
    }, l = function() {
        h = null, m();
    }, m = function() {
        var a = null;
        a = h ? h : g;
        var b = i.className.split(" ");
        b = b.filter(function(a) {
            return 0 !== a.lastIndexOf("curse-words-", 0);
        }), b.push("curse-words-" + a), i.className = b.join(" ");
    };
    return document.addEventListener("mouseover", function(b) {
        for (var e = 0; e < c.length; e++) if (b.target == c[e]) return null != a && f[a](b), 
        a = e, void d[a](b);
        null != a && f[a](b), g = "default", m(), a = null;
    }), document.addEventListener("mousemove", function(b) {
        if (null != a) {
            var c = e[a](b);
            c != g && (g = c, m());
        }
    }), {
        addImplicitCursorHandler: j,
        setExplicitCursor: k,
        clearExplicitCursor: l
    };
}(), DragKing = function() {
    function a(a) {
        return function(c) {
            h() && c.which > a | 0 && (f[b](c), b = null);
        };
    }
    var b = null, c = 0, d = [], e = [], f = [], g = function() {
        return b;
    }, h = function() {
        return null !== b;
    }, i = function(a, g, h, i) {
        var j = function(a) {
            return function(c) {
                1 == c.which && (b = a, d[a](c), c.preventDefault());
            };
        }(c);
        a.addEventListener("mousedown", j), d[c] = g, e[c] = h, f[c] = i, c++;
    };
    return document.onmousewheel = function(a) {
        h() && a.preventDefault();
    }, document.addEventListener("mousemove", function(a) {
        h() && e[b](a);
    }), document.addEventListener("mouseup", a(!1)), document.addEventListener("mousedown", a(!0)), 
    {
        getCurrentTarget: g,
        isDragging: h,
        addHandler: i
    };
}();

GripScroll = function() {
    function a(a, b) {
        this.canvas = a.appendChild(document.createElement("canvas")), this.canvasContext = this.canvas.getContext("2d"), 
        this.canvas.className = "bar " + b.direction, this.direction = b.direction, this.perpendicular = {
            x: "y",
            y: "x"
        }[this.direction], this.smallestZoom = .125, this.isHovering = !1, this.isDragging = !1, 
        this.wasHovering = null, this.wasDragging = null, this.width = null, this.height = null, 
        this.model = {
            min: b.min || 0,
            max: b.max || 1
        }, this.oldDrawModel = {
            min: null,
            max: null
        }, this.init = function() {
            switch (this.direction) {
              case "x":
                this.canvas.width = this.width = a.clientWidth - 20, this.canvas.height = this.height = 10;
                break;

              case "y":
                this.canvas.width = this.width = 10, this.canvas.height = this.height = a.clientHeight - 20;
            }
            this.wasHovering = null, this.wasDragging = null, this.oldDrawModel.min = null, 
            this.oldDrawModel.max = null, this.render(this.model.min, this.model.max);
        }, this.render = function(b, c) {
            if (b || 0 === b ? c || (c = b.max, b = b.min) : (b = this.model.min, c = this.model.max), 
            b != this.oldDrawModel.min || this.wasHovering != this.isHovering || c != this.oldDrawModel.max || this.wasDragging != this.isDragging) {
                switch (this.canvasContext.clear(), this.isHovering || this.isDragging ? this.canvas.classList.add("is-mouseover") : this.canvas.classList.remove("is-mouseover"), 
                this.canvasContext.strokeStyle = "rgb(64,64,64)", this.canvasContext.fillStyle = "rgb(96,96,96)", 
                this.direction) {
                  case "x":
                    this.canvasContext.roundRect(this.width * b, 0, this.width * c, this.height, 5, !0, !0);
                    break;

                  case "y":
                    this.canvasContext.roundRect(0, this.height * b, this.width, this.height * c, 5, !0, !0);
                }
                if (b != this.oldDrawModel.min || c != this.oldDrawModel.max) {
                    var d = new CustomEvent("gripscroll-update");
                    d.min = b, d.max = c, d.direction = this.direction, a.dispatchEvent(d);
                }
                this.wasHovering = this.isHovering, this.wasDragging = this.isDragging, this.oldDrawModel.min = b, 
                this.oldDrawModel.max = c;
            }
        }, this.save = function(a, b) {
            this.model[b] = a;
        }, this.calculateCursorPosition = function(a) {
            var b = this.canvas.clientXYDirectional(this.direction), c = a.clientXYDirectional(this.direction), d = this.canvas.clientLength(this.direction), e = (c - b) / d;
            return e;
        }, this.whichGrip = function(a) {
            return Math.abs(a - this.model.min) < this.pxToPct(5) ? "min" : Math.abs(a - this.model.max) < this.pxToPct(5) ? "max" : a > this.model.min && a < this.model.max ? "mid" : null;
        }, this.isOutsideDragZone = function(a) {
            var b = this.canvas.clientXYDirectional(this.perpendicular, 1), c = a.clientXYDirectional(this.perpendicular, 1);
            return Math.abs(c - b) > 150 ? !0 : void 0;
        }, this.validateEndPosition = function(a, b) {
            switch (b) {
              case "min":
                0 > a ? a = 0 : a > this.model.max - this.smallestZoom && (a = this.model.max - this.smallestZoom);
                break;

              case "max":
                a > 1 ? a = 1 : a < this.model.min + this.smallestZoom && (a = this.model.min + this.smallestZoom);
            }
            return a;
        }, this.validateBothEndPositions = function(a) {
            var b = this.model.min + a;
            0 > b && (a -= b);
            var c = this.model.max + a;
            c > 1 && (a -= c - 1);
            var d = {};
            return d.min = a + this.model.min, d.max = a + this.model.max, d;
        }, this.recalculateModel = function(a, b, c) {
            if (b && this.isOutsideDragZone(a)) return this.render(this.model), null;
            if ("mid" == b) {
                var d = this.calculateCursorPosition(a), e = this.validateBothEndPositions(d - c);
                return this.render(e), e;
            }
            if ("min" == b || "max" == b) {
                var d = this.calculateCursorPosition(a);
                d = this.validateEndPosition(d, b);
                var f = {
                    min: "max",
                    max: "min"
                }[b], e = {};
                return e[b] = d, e[f] = this.model[f], this.render(e), e;
            }
            return null;
        }, this.pxToPct = function() {
            switch (this.direction) {
              case "x":
                return 5 / this.width;

              case "y":
                return 5 / this.height;
            }
        };
        var c = this;
        c.init(), window.addEventListener("resize", function() {
            c.init();
        });
        var d = null, e = null;
        DragKing.addHandler(c.canvas, function(a) {
            c.isDragging = !0, e = c.calculateCursorPosition(a), d = c.whichGrip(e), "mid" == d ? CurseWords.setExplicitCursor("grabbing") : d && CurseWords.setExplicitCursor(c.direction + "resize");
        }, function(a) {
            c.recalculateModel(a, d, e);
        }, function(a) {
            c.isDragging = !1, CurseWords.clearExplicitCursor();
            var b = c.recalculateModel(a, d, e);
            b && (c.save(b.min, "min"), c.save(b.max, "max"));
        }), CurseWords.addImplicitCursorHandler(c.canvas, function() {
            c.isHovering = !0, c.render();
        }, function(a) {
            var b = c.calculateCursorPosition(a), d = c.whichGrip(b), e = null;
            switch (d) {
              case "min":
                c.isHovering = !0, e = c.direction + "resize";
                break;

              case "max":
                c.isHovering = !0, e = c.direction + "resize";
                break;

              case "mid":
                c.isHovering = !0, e = "grab";
                break;

              default:
                c.isHovering = !1, e = "default";
            }
            return c.render(), e;
        }, function() {
            c.isHovering = !1, c.render();
        });
    }
    var b = [], c = [], d = function(d, e) {
        e = e || {};
        for (var f = 0; f < b.length; f++) if (b[f] == d) return;
        b.push(d), c.push({
            x: new a(d, {
                direction: "x",
                min: e.x1 || 0,
                max: e.x2 || 1
            }),
            y: new a(d, {
                direction: "y",
                min: e.y1 || 0,
                max: e.y2 || 1
            })
        });
    };
    return {
        add: d
    };
}(), MouseEvent.prototype.clientXYDirectional = MouseEvent.prototype.clientXYDirectional || function(a, b) {
    switch (b = void 0 === b ? 1 : b, a) {
      case "x":
        switch (b > 0) {
          case !0:
            return this.clientX;

          case !1:
            return window.innerWidth - this.clientX;
        }

      case "y":
        switch (b > 0) {
          case !0:
            return this.clientY;

          case !1:
            return window.innerHeight - this.clientY;
        }

      default:
        return null;
    }
}, Element.prototype.offsetDirectional = Element.prototype.offsetDirectional || function(a, b) {
    switch (b = void 0 === b ? 1 : b, a) {
      case "x":
        switch (b > 0) {
          case !0:
            return this.offsetLeft;

          case !1:
            return this.parentElement.offsetWidth - this.offsetWidth - this.offsetLeft;
        }

      case "y":
        switch (b > 0) {
          case !0:
            return this.offsetTop;

          case !1:
            return this.parentElement.offsetHeight - this.offsetHeight - this.offsetTop;
        }

      default:
        return null;
    }
}, Element.prototype.clientXYDirectional = Element.prototype.clientXYDirectional || function(a, b) {
    b = void 0 === b ? 1 : b;
    var c = this.getBoundingClientRect();
    switch (a) {
      case "x":
        switch (b > 0) {
          case !0:
            return c.left;

          case !1:
            return window.innerWidth - c.left - c.width;
        }

      case "y":
        switch (b > 0) {
          case !0:
            return c.top;

          case !1:
            return window.innerHeight - c.top - c.height;
        }

      default:
        return null;
    }
}, Element.prototype.clientLength = Element.prototype.clientLength || function(a) {
    var b = this.getBoundingClientRect();
    switch (a) {
      default:
      case "x":
        return b.width;

      case "y":
        return b.height;
    }
}, CanvasRenderingContext2D.prototype.clear = CanvasRenderingContext2D.prototype.clear || function(a) {
    a && (this.save(), this.setTransform(1, 0, 0, 1, 0, 0)), this.clearRect(0, 0, this.canvas.width, this.canvas.height), 
    a && this.restore();
}, CanvasRenderingContext2D.prototype.roundRect = CanvasRenderingContext2D.prototype.roundRect || function(a, b, c, d, e, f, g) {
    this.beginPath(), this.moveTo(.5 + a + e, .5 + b), this.lineTo(-.5 + c - e, .5 + b), 
    this.quadraticCurveTo(-.5 + c, .5 + b, -.5 + c, .5 + b + e), this.lineTo(-.5 + c, -.5 + d - e), 
    this.quadraticCurveTo(-.5 + c, -.5 + d, -.5 + c - e, -.5 + d), this.lineTo(.5 + a + e, -.5 + d), 
    this.quadraticCurveTo(.5 + a, -.5 + d, .5 + a, -.5 + d - e), this.lineTo(.5 + a, .5 + b + e), 
    this.quadraticCurveTo(.5 + a, .5 + b, .5 + a + e, .5 + b), this.closePath(), g && this.stroke(), 
    f && this.fill();
};
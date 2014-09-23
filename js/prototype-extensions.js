// ============================================================================
// MATH EXTENSIONS
// ============================================================================
// In 2D vector graphics, single-pixel stroke width must be drawn at a half-pixel position, otherwise it gets sub-pixel blurring
Math.closestHalfPixel =
  Math.closestHalfPixel || function (pixels)
{
    return parseInt( 0.5 + pixels ) - 0.5; // parseInt is a hack for efficient rounding
};


// ============================================================================
// CANVAS EXTENSIONS
// ============================================================================
// Lines
CanvasRenderingContext2D.prototype.drawLine = 
  CanvasRenderingContext2D.prototype.drawLine || function (x1, y1, x2, y2, xyFlip)
{
  if( xyFlip )
  {
    x1 = [y1, y1 = x1][0];
    x2 = [y2, y2 = x2][0];
  }
  this.moveTo( x1, y1 );
  this.lineTo( x2, y2 );
};

// Background fill
CanvasRenderingContext2D.prototype.backgroundFill = 
  CanvasRenderingContext2D.prototype.backgroundFill || function (color)
{
  this.fillStyle = color;
  this.fillRect( 0, 0, this.canvas.width, this.canvas.height );
};


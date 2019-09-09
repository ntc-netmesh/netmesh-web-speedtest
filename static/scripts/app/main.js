///////////////////////////////////////////////////////////////////////////////
//  Speedtest GUI using HTML5 Canvas                                         //
///////////////////////////////////////////////////////////////////////////////
/******************************************************************************
Revision history:
Version 0.1 Initial Release
******************************************************************************/

///////////////////////////////////////////////////////////////////////////////
// Directives
///////////////////////////////////////////////////////////////////////////////
"use strict";

///////////////////////////////////////////////////////////////////////////////
// Generic/helper methods
///////////////////////////////////////////////////////////////////////////////
const Helper = {
	// Function for adding an event listener
	_registry: null,
	initialise: () => {
		if (Helper._registry === null) {
			Helper._registry = [];
			Helper.addEvent(window, 'unload', Helper.cleanUp);
		}
	},
	cleanUp: () => {
		for (let i = 0; i < Helper._registry.length; i++) {
			let obj = Helper._registry[i].obj;
			let evType = Helper._registry[i].evType;
			let fn = Helper._registry[i].fn;
			let useCapture = Helper._registry[i].useCapture;
			if (obj.removeEventListener)
				obj.removeEventListener(evType, fn, useCapture);
			else if (obj.detachEvent)
				obj.detachEvent("on" + evType, fn);
		}
		Helper._registry = null;
	},
	addEvent: (obj, evType, fn, useCapture) => {
		Helper.initialise();
		if (typeof obj === 'string')
			obj = document.getElementById(obj);
		if ((obj === null) || (fn === null))
			return false;
		if (obj.addEventListener) {
			obj.addEventListener(evType, fn, useCapture);
			Helper._registry.push({obj: obj, evType: evType, fn: fn, useCapture: useCapture});
			return true;
		}
		if (obj.attachEvent) {
			let r = obj.attachEvent("on" + evType, fn);
			if (r) Helper._registry.push({obj: obj, evType: evType, fn: fn, useCapture: false});
			return r;
		}
		return false;
	},
};

///////////////////////////////////////////////////////////////////////////////
// Rect class
///////////////////////////////////////////////////////////////////////////////
class Rect {
	constructor(x=0, y=0, w=0, h=0) {
		this._x = x;
		this._y = y;
		this._w = w;
		this._h = h;
	}
	isPointInRect(x, y) {
		if (x < this._x) return false;
		if (x > this._x + this._w) return false;
		if (y < this._y) return false;
		if (y > this._y + this._h) return false;
		return true;
	}
	set x (val) { this._x = val; }
	get x ()    { return this._x; }
	set y (val) { this._y = val; }
	get y ()    { return this._y; }
	set w (val) { this._w = val; }
	get w ()    { return this._w; }
	set h (val) { this._h = val; }
	get h ()    { return this._h; }
}

///////////////////////////////////////////////////////////////////////////////
// 2D vector class
///////////////////////////////////////////////////////////////////////////////
class Vector2d {
	constructor(x=0, y=0) {
		this.vx = x;
		this.vy = y;
	}
	set(x, y) {
		this.vx = x;
		this.vy = y;
	}
	copy(vec2) {
		this.vx = vec2.vx;
		this.vy = vec2.vy;
	}
	scale(scale) {
		this.vx *= scale;
		this.vy *= scale;
	}
	add(vec2) {
		this.vx += vec2.vx;
		this.vy += vec2.vy;
	}
	sub(vec2) {
		this.vx -= vec2.vx;
		this.vy -= vec2.vy;
	}
	equal(vec2) {
		return ((this.vx == vec2.vx) && (this.vy == vec2.vy));
	}
	length() {
		return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
	}
	lengthSquared() {
		return this.vx * this.vx + vec.vy * vec.vy;
	}
	normalize() {
		let len = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
		if (len) {
			this.vx /= len;
			this.vy /= len;
		}
		return len;
	}
	rotate(angle) {
		let vx = this.vx,
				vy = this.vy,
				cosVal = Math.cos(angle),
				sinVal = Math.sin(angle);
		this.vx = vx * cosVal - vy * sinVal;
		this.vy = vx * sinVal + vy * cosVal;
	}
	lerp(vec1, vec2, amt) {
		this.vx = (1-amt) * vec1.vx + (amt) * vec2.vx;
		this.vy = (1-amt) * vec1.vy + (amt) * vec2.vy;
	}
	distance(vec2) {
		let a = (vec2.vx-this.vx);
		let b = (vec2.vy-this.vy);
		return Math.sqrt(a*a + b*b);
	}
}

///////////////////////////////////////////////////////////////////////////////
// Main Dashboard
///////////////////////////////////////////////////////////////////////////////
const Dashboard = {
	canvasid: 0,
	canvas: 0,
	context: 0,
	redraw: false,
	update: false,

	/* event handling */
	mouseMove: false,
	mouseClick: false,
	mouseUp: false,
	mouseDown: false,
	mouseOut: false,
	touchStart: false,
	touchEnd: false,
	keyDown: false,
	keyUp: false,
	keyChar: 0,
	keyPressed: 0,
	downTime: 0,
	eventProcessed: false,
    
	coord: new Vector2d(0,0),
	click: new Vector2d(0,0),
	targetPos: new Vector2d(0,0),
	transTime: 1.0,
	
	gui: new Map(),

	// ES6: Do not use fat arrow, as 'this' will refer to 'window'
	//      'this' must refer to Dashboard
	Init: function(id, width, height) {
		this.canvasid = id;
		this.canvas = document.getElementById(id);
		this.context = this.canvas.getContext('2d');
		this.canvas.setAttribute('width', width);
		this.canvas.setAttribute('height', height);
        
		this.coord = new Vector2d(width/2, height/2);
		this.targetPos.copy(this.coord);        
    
		// add mouse/touch input events
		this.addListeners();
		this.update = true;		// use this.update = false to wait when loading resources
		this.redraw = true;		// use this.redraw = false when redraw not necessary
		this.tick(1000/60);		// for 60fps
	},
	
	// Add mouse, keyboard, touch listeners
	addListeners: function() {
		Helper.addEvent(this.canvas, 'mousemove', (e) => {
			this.mouseOut = false;
			this.mouseUp = false;
			this.mouseDown = false;
			this.mouseMove = true;
			this.handleEvents(e);
		}, false);
		Helper.addEvent(this.canvas, 'mousedown', (e) => {
			e.preventDefault();
			if (e.which != 1) return;
			this.mouseDown = true;
			this.downTime = Date.now();
			this.handleEvents(e);
		}, false);
		Helper.addEvent(this.canvas, 'mouseup', (e) => {
			if (e.which != 1) return;
			this.mouseUp = true;
			this.mouseDown = false;
			this.handleEvents(e);
		}, false);
		Helper.addEvent(this.canvas, 'mouseover', (e) => {
			this.mouseOut = false;
			this.handleEvents(e);
		}, false);
		Helper.addEvent(this.canvas, 'mouseout', (e) => {
			this.mouseOut = true;
		}, false);
		Helper.addEvent(this.canvas, 'touchstart', (e) => {
			e.preventDefault();
			this.mouseOut = false;
			this.touchStart = true;
			this.downTime = Date.now();
			this.handleEvents(e);
		}, {passive:true}); //false);
		Helper.addEvent(this.canvas, 'touchmove', (e) => {
			e.preventDefault();
			this.mouseOut = false;
			this.mouseMove = true;
			this.handleEvents(e);
		}, {passive:true}); //false););
		Helper.addEvent(this.canvas, 'touchend', (e) => {
			e.preventDefault();
			this.mouseOut = false;
			this.touchEnd = true;
			this.handleEvents(e);
		}, false);
		// addEventListener to body for 'touchcancel' ?
		Helper.addEvent(document.body, 'touchcancel', (e) => {
			this.mouseOut = true;
			this.touchStart = false;
			this.touchEnd = false;
		}, false);
		// add keyboard events: Return/Enter, arrow keys
		Helper.addEvent(this.canvas, 'keyup', (e) => {
			this.keyUp = true;
			this.keyDown = false;
			this.keyPressed = 0;
			if (this.keyChar == 13) {
				// process Enter/Return
				this.handleEvents(e);
				this.keyChar = 0;
			}
		}, false);
		Helper.addEvent(this.canvas, 'keydown', (e) => {
			if (!this.mouseOut) {
				this.keyUp = false;
				this.keyDown = true;
				this.keyChar = e.keyCode;
				switch (e.keyCode) {
					case 37:	//left
					case 38:	//up
					case 39:	//right
					case 40:	//down
						this.keyPressed = e.keyCode;
						this.handleEvents(e);
						break;
					default:
						break;
				}
			}
		}, false);
	},
	handleEvents: function(evt) {
		if (this.mouseOut) { this.canvas.blur(); return; }
		// give focus to canvas element
		//this.canvas.setAttribute('tabindex','0');
		this.canvas.focus();

		// all mouse and touch moves
		if (!this.keyDown && !this.keyUp)
			this.targetPos = (this.touchStart && !this.touchEnd) ? 
							this.getTouchPosition(this.canvas, evt) :
							this.getMousePosition(this.canvas, evt);

		// mouse click / touch end
		if (this.mouseUp || this.touchEnd || this.keyUp) {
			this.click.copy(this.coord);	// used only for debug
			if ((Math.abs(this.downTime - Date.now()) <= 200) && !this.mouseClick) {
				this.mouseClick = true;
				this.mouseUp = false;
				this.touchEnd = false;
				this.touchStart = false;
				this.keyUp = false;
			}
			for (let [key, controls] of Dashboard.gui.entries()) {
				if ((controls.type == 'button') && (controls.onClick)) {
					if (controls.isPointInButton(this.targetPos))
						controls.state = BUTTON_HOVER;
					else
						controls.state = BUTTON_BASE;
				}
			}
		}
		else if (this.mouseDown || this.touchStart) {
			for (let [key, controls] of Dashboard.gui.entries()) {
				if ((controls.type == 'button') && (controls.onClick)) {
					if (controls.isPointInButton(this.targetPos))
						controls.state = BUTTON_CLICK;
					else
						controls.state = BUTTON_BASE;
				}
			}
		}
		else if (this.mouseMove) {
			//console.log(`${this.targetPos.vx}, ${this.targetPos.vy}`);
			for (let [key, controls] of Dashboard.gui.entries()) {
				if ((controls.type == 'button') && (controls.onClick)) {
					if (controls.isPointInButton(this.targetPos))
						controls.state = (controls.state != BUTTON_CLICK) ? BUTTON_HOVER : BUTTON_CLICK;
					else
						controls.state = BUTTON_BASE;
				}
			}
		}
		else if (this.keyChar != 0) {
			// TODO: menu up/down
			this.keyChar = 0;
		}

		this.eventProcessed = true;
	},
	getMousePosition: function(obj, event) {
		let pos = new Vector2d(event.pageX, event.pageY);
		pos.vx -= obj.offsetLeft + obj.offsetParent.offsetLeft;
		pos.vy -= obj.offsetTop + obj.offsetParent.offsetTop;
		// scale accdg to automatic responsive resizing
		let scale = obj.width/obj.clientWidth;
		pos.vx = Math.max(0, Math.min(obj.width, pos.vx*scale));
		pos.vy = Math.max(0, Math.min(obj.height, pos.vy*scale));
		try { return pos; }
		finally { pos = null; }
	},
	getTouchPosition: function(obj, event) {
		let pos = new Vector2d(0,0);
		if ((event.touches != null) ) {
			pos.vx = event.touches[0].pageX - obj.offsetLeft - obj.offsetParent.offsetLeft;
			pos.vy = event.touches[0].pageY - obj.offsetTop - obj.offsetParent.offsetTop;
		}
		else {
			pos.vx = event.targetTouches[0].pageX - obj.offsetLeft - obj.offsetParent.offsetLeft;
			pos.vy = event.targetTouches[0].pageY - obj.offsetTop - obj.offsetParent.offsetTop;
		}
		let scale = obj.width/obj.clientWidth;
		pos.vx = Math.max(0, Math.min(obj.width, pos.vx*scale));
		pos.vy = Math.max(0, Math.min(obj.height, pos.vy*scale));
		try { return pos; }
		finally { pos = null; }
	},

	// Dashboard Update function
	Update: function(elapsed) {
		// Note: set this.redraw to true if update needs a redraw
		this.inputFocus = true;
		for (let [key, control] of this.gui) {
			if (control.inputFocus)
				this.inputFocus = false;
		}
		this.coord.copy(this.targetPos);

		// handle user inputs
		if (this.mouseMove) {
			this.redraw = true;
		}       
		let running_update = true;
		for (let [key, object] of this.gui.entries()) {
			if (!object.Update(elapsed)) {
				running_update = false;
			}
		}
		this.update = running_update;

		// update stage transition time
		if (this.transTime > 0) {
			this.transTime = Math.max(0, this.transTime - elapsed/1000);
		}

		// reset clicked, assumed processing done
		if (this.eventProcessed) {
			this.mouseClick = false;
            this.mouseUp = false;
			this.mouseMove = false;
			this.touchStart = false;
			this.touchEnd = false;
			this.eventProcessed = false;
		}
    },
    pUpdate: function(elapsed) {
        let promise = new Promise((resolve, reject) => {
            resolve(this.Update(elapsed));
        });
        return promise;
    },
	// Dashboard Draw function
	Draw: function() {
		if (this.redraw)
			this.context.clearRect(0,0,this.canvas.width,this.canvas.height);		
		let running_draw = false;
		
		// draw gui here
        for (let [key, control] of this.gui.entries()) {
            if (control.Draw()) running_draw = true;
            if (this.redraw && control.visible) {
				this.context.drawImage(control.context.canvas, 
									   control.origin.vx>>0, 
									   control.origin.vy>>0);		
			}
			if ((control.type == 'button') && control.visible) {
				if ((control.state==BUTTON_HOVER) && control.tooltip && (this.transTime<=0))
					control.showTooltip(this);
			}
        }
        
		// update redraw variable
		this.redraw = running_draw;
        //if (this.redraw) {}
    },  
    pDraw: function() {
        let promise = new Promise((resolve, reject) => {
            resolve(this.Draw());
        });
        return promise;
    },     

	tick: function(interval) {	
		let now = new Date().getTime();
		let elapsed = now - this.curtime;	// time since last update
		this.curtime = now;

		// update/draw the stage
		if (__DEBUG_PROMISE__) {
			this.Update(elapsed);
			this.Draw();
		}
		else {
			this.pUpdate(elapsed)
				.then(() => this.pDraw())
				.catch((err) => console.log(err.message));
		}

		// setup next timer tick
		requestAnimFrame(() => {
			Dashboard.tick(interval);
		});
	},
}

// Function to determine optimal animation frame
window.requestAnimFrame = ((callback) => {
	return window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	window.oRequestAnimationFrame ||
	window.msRequestAnimationFrame ||
	function(callback){
		window.setTimeout(callback, 1000 / 60);
	};
})();
// Helper function on window resize
window.onresize = (() => {
	//for (let i=0; i<document.forms.length; i++) {
    for (let f of document.forms) {
        let x = Dashboard.canvas.offsetLeft + (Dashboard.canvas.clientWidth-f.clientWidth)/2;
        let y = Dashboard.canvas.offsetTop + (Dashboard.canvas.clientHeight-f.clientHeight)/2;
		f.setAttribute('style', 'position:absolute; left:'+x+'px; top:'+y+'px;');
	}
});


const __DEBUG_PROMISE__ = false;
/* Loosely based on teslahud.js by Tameem Imamdad timamdad@hawk.iit.edu */

///////////////////////////////////////////////////////////////////////////////
// Directives
///////////////////////////////////////////////////////////////////////////////
"use strict";

///////////////////////////////////////////////////////////////////////////////
// Half gauge control
///////////////////////////////////////////////////////////////////////////////
const DEG_LEFT_START = 135;			// bottom tick is 16 degrees from vertical
const DEG_LEFT_END = 262;			// top tick is 8 degrees from vertical
const DEG_RIGHT_START = 45;			
const DEG_RIGHT_END = -82;
const DEF_RANGE = [0,20,5,2.5];	// min,max,major,minor
const DEF_EASE = 15;
const DEF_SCALE = [
	[0,10,2,1],
	[0,20,5,2.5],
	[0,50,10,5]
];

const DEG_HALF_START = 140;
const DEG_HALF_END = 250;
const DEF_LOG = [-1,4,1,0.5];

const DEG_PIE_START = 120;
const DEG_PIE_END = 60;


class DualGauge {
	constructor(param) {
		this.isready = false;
		this.redraw = true;
		this.update = false;
		this.visible = true;
		this.type = 'gauge';
		
		let canvas = document.createElement('canvas');
		canvas.id = escape(param.id);
		this.id = param.id;
		this.context = canvas.getContext('2d');
		this.rect = param.rect;
		this.origin = new Vector2d(this.rect.x, this.rect.y);
		this.center = new Vector2d(this.rect.w/2, this.rect.h/2);
		this.radius = this.rect.w/2;
		this.scale = param.scale ? param.scale : 'linear';
		this.color = param.colors ? param.colors : ['white','white'];
		this.text = param.text? param.text : ['',''];
		this.range = param.range ? param.range : DEF_RANGE;
		this.showPeak = param.showPeak ? param.showPeak : false;
		this.speed = [0, 0];
		// internal
		this.targetSpeed = [0, 0];
		//this.prevSpeed = [0, 0];
		this.easeSpeed = [DEF_EASE, DEF_EASE];
		this.prevRange = this.range;
		this._end = false;
		this.peak = [this.range[0], this.range[0]];
		
		this.colorGradient = new Array();
		let gradient = this.context.createLinearGradient(0,500,0,0);
        gradient.addColorStop(0, `Dark${this.color[0]}`);		
        gradient.addColorStop(1, this.color[0]);
		this.colorGradient.push(gradient);
		if (this.color[1]) {
			gradient = this.context.createLinearGradient(0,500,0,0);
			gradient.addColorStop(0, `Dark${this.color[1]}`);
			gradient.addColorStop(1, this.color[1]);
			this.colorGradient.push(gradient);
		}

		this.context.canvas.setAttribute('width',this.rect.w);
		this.context.canvas.setAttribute('height',this.rect.h);
		this.isready = true;		
		
		Dashboard.gui.set(this.id, this);
	}
	get speed0 () { return this.speed[0]; }
	get speed1 () { return this.speed[1]; }
	set speed0 (val) {
		//let v = Math.max(Math.min(val, this.range[1]), this.range[0]);
		let v = Math.max(val, this.range[0]);
		this.autoscale(v);

		this.targetSpeed[0] = (v>10) ? Math.round(v*100)/100 : Math.round(v*1000)/1000;
		this.easeSpeed[0] = DEF_EASE;
	}
	set speed1 (val) {
		//let v = Math.max(Math.min(val, this.range[1]), this.range[0]);
		let v = Math.max(val, this.range[0]);
		this.autoscale(v);

		this.targetSpeed[1] = (v>10) ? Math.round(v*100)/100 : Math.round(v*1000)/1000;
		this.easeSpeed[1] = DEF_EASE;
	}
	set axis (val) {
		this.range = val;
		this.redraw = true;
	}
	set end (val) {
		this._end = true;
		this.redraw = true;
	}
	reset() {
		this.range = this.prevRange;
		this.targetSpeed = [0, 0];
		//this.prevSpeed = [0, 0];
		this.easeSpeed = [DEF_EASE, DEF_EASE];
		this._end = false;
		this.peak = [this.range[0],this.range[0]];
	}
	drawTicks(rotation, width, speed, color='#333') {
		this.context.save();
		this.context.lineWidth = width;
		this.context.translate(this.center.vx, this.center.vy);
		this.context.rotate(rotation);
		this.context.strokeStyle = color;
		this.context.fillStyle = color;
		this.context.strokeRect(this.radius-40, 1, 20, 1);
		this.context.restore();

		let x = (this.center.vx + (this.radius-60) * Math.cos(rotation));
		let y = (this.center.vy + (this.radius-60) * Math.sin(rotation));

		this.context.font = "16px MuseoSans_900-webfont";
		this.context.textAlign = 'center';
		this.context.fillText(speed, x, y+6);	// font offset

		rotation += Math.PI / 180;
	}
	calculateAngle(x, start, end) {
		let degree = (end - start) * (x) + start;
		return (degree * Math.PI) / 180;
	}
	drawNeedle(rotation) {
		this.context.save();
		this.context.lineWidth = 2;
		this.context.translate(this.center.vx, this.center.vy);
		this.context.rotate(rotation);
		this.context.strokeRect(105, -1, this.radius-115, 2);
		this.context.restore();

		rotation += Math.PI / 180;
	}
	autoscale(val) {
		if (val < this.range[1]) return;
		
		let tmprange = [];
		if (val > 500)
			tmprange = [0, 100*DEF_SCALE[0][1], 100*DEF_SCALE[0][2], 100*DEF_SCALE[0][3]]
		else if (val > 200)
			tmprange = [0, 10*DEF_SCALE[2][1], 10*DEF_SCALE[2][2], 10*DEF_SCALE[2][3]]
		else if (val > 100)
			tmprange = [0, 10*DEF_SCALE[1][1], 10*DEF_SCALE[1][2], 10*DEF_SCALE[1][3]]
		else if (val > 50)
			tmprange = [0, 10*DEF_SCALE[0][1], 10*DEF_SCALE[0][2], 10*DEF_SCALE[0][3]]
		else if (val > 20)
			tmprange = DEF_SCALE[2];
		else if (val > 10)
			tmprange = DEF_SCALE[1];
		else
			tmprange = DEF_SCALE[0];

		if (tmprange[1] > this.range[1]) {
			this.range = tmprange;
			this.redraw = true;
		}
	}
	Update(elapsed) {
		for (let i in this.speed) {
			if (this.speed[i] != this.targetSpeed[i]) {
				//this.speed[i] = this.targetSpeed[i];
				let factor = (DEF_EASE - (--this.easeSpeed[i])) / DEF_EASE;
				let ease = factor * factor; // * (3 - 2*factor);
				this.speed[i] = ease * (this.targetSpeed[i] - this.speed[i]) + this.speed[i];
				this.peak[i] = this.targetSpeed[i] > this.peak[i] ? this.speed[i] : this.peak[i];

				this.redraw = true;
			}
			else {
				this.easeSpeed[i] = DEF_EASE;
				//this.prevSpeed[i] = this.targetSpeed[i];
			}
		}
        return this.update;		
	}
	Draw() {
        if (!this.isready) return false;
        if (!this.redraw) return false;		

		this.context.clearRect(0,0,this.context.canvas.width,this.context.canvas.height);
		if (this.visible) {
			// background
			this.context.save();
			this.context.beginPath();
			this.context.fillStyle = 'rgba(0, 0, 0, .9)';
			this.context.arc(this.center.vx, this.center.vy, this.radius, 0, 2*Math.PI);
			this.context.fill();
			// middle ring
			this.context.beginPath();
			this.context.strokeStyle = "#333";
			this.context.lineWidth = 10;
			this.context.arc(this.center.vx, this.center.vy, 100, 0, 2*Math.PI);
			this.context.stroke();
			// outer ring
			this.context.beginPath();
			this.context.lineWidth = 3;
			this.context.arc(this.center.vx, this.center.vy, this.rect.w/2-10, 0, 2*Math.PI);
			this.context.stroke();
			// units
			this.context.fillStyle = "#FFF";
			this.context.font = "15px MuseoSans_900-webfont";
			this.context.textAlign = "center";
			this.context.textBaseline = 'middle';
			this.context.fillText(this.text[2], this.center.vx, this.center.vy-30);
			// speed
			this.context.font = "10px MuseoSans_900-webfont";
			this.context.fillStyle = this.color[0];
			this.context.fillText(this.text[0], this.center.vx, this.center.vy-80);
			this.context.fillStyle = this.color[1];
			this.context.fillText(this.text[1], this.center.vx, this.center.vy+20);
			this.context.font = "30px MuseoSans_900-webfont";
			if (this._end) {
				//this.context.shadowBlur = 10;
				//this.context.shadowColor = `Dark${this.color[0]}`;
				this.context.font = "40px MuseoSans_900-webfont";
			}
			//this.context.textBaseline = 'top';
			this.context.fillStyle = this.color[0];
			this.context.fillText(this.targetSpeed[0], this.center.vx, this.center.vy-53);
			//this.context.textBaseline = 'bottom';
			this.context.fillStyle = this.color[1];
			this.context.fillText(this.targetSpeed[1], this.center.vx, this.center.vy+0);

			// range/grid
			this.context.fillStyle = "#FFF";
			for (let i=this.range[0]; i<=Math.ceil(this.range[1]/this.range[2])*this.range[2]; i+=this.range[3]) {
				this.drawTicks(this.calculateAngle(i / this.range[1], DEG_LEFT_START, DEG_LEFT_END,), i%this.range[2]==0?3:1, i%this.range[2]==0?i:'', this.color[0]); // DL
				this.drawTicks(this.calculateAngle(i / this.range[1], DEG_RIGHT_START-1, DEG_RIGHT_END), i%this.range[2]==0?3:1, i%this.range[2]==0?i:'', this.color[1]); // UL
			}

			// draw DL bar
			this.context.lineWidth = 25;
			this.context.shadowBlur = 20;
			this.context.shadowColor = `Dark${this.color[0]}`;
			this.context.strokeStyle = this.colorGradient[0]; //this.color[0];
			if (this.showPeak) {
				this.context.beginPath();
				this.context.globalAlpha = 0.10;
				this.context.arc(this.center.vx, this.center.vy, this.radius-20, DEG_LEFT_START*Math.PI/180, 
							this.calculateAngle(this.peak[0] / this.range[1], DEG_LEFT_START, DEG_LEFT_END));
				this.context.stroke();
			}
			this.context.beginPath();
			this.context.globalAlpha = 0.75;
			this.context.arc(this.center.vx, this.center.vy, this.radius-20, DEG_LEFT_START*Math.PI/180, 
						this.calculateAngle(this.speed[0] / this.range[1], DEG_LEFT_START, DEG_LEFT_END));
			this.context.stroke();
			// draw UL bar
			//this.context.lineWidth = 25;
			//this.context.shadowBlur = 20;
			this.context.shadowColor = `Dark${this.color[1]}`;
			this.context.strokeStyle = this.colorGradient[1]; //this.color[1];.4111 * Math.PI
			if (this.showPeak) {
				this.context.beginPath();
				this.context.globalAlpha = 0.10;
				this.context.arc(this.center.vx, this.center.vy, this.radius-20, DEG_RIGHT_START*Math.PI/180, 
							this.calculateAngle(this.peak[1] / this.range[1], DEG_RIGHT_START, DEG_RIGHT_END), true);
				this.context.stroke();
			}
			this.context.beginPath();
			this.context.globalAlpha = 0.75;
			this.context.arc(this.center.vx, this.center.vy, this.radius-20, DEG_RIGHT_START*Math.PI/180, 
						this.calculateAngle(this.speed[1] / this.range[1], DEG_RIGHT_START, DEG_RIGHT_END), true);
			this.context.stroke();
			this.context.globalAlpha = 1;
			// draw DL needle
			this.context.shadowBlur = 0;
			this.context.strokeStyle = this.color[0];
			this.drawNeedle(this.calculateAngle(this.speed[0] / this.range[1], DEG_LEFT_START, DEG_LEFT_END));
			// draw UL needle
			this.context.strokeStyle = this.color[1];
			this.drawNeedle(this.calculateAngle(this.speed[1] / this.range[1], DEG_RIGHT_START, DEG_RIGHT_END));

			this.context.restore();
		}
			
		this.redraw = false;
		this.update = true;
		return true;
	}
}

class HalfGauge extends DualGauge {
	constructor(param){
		super(param);
		this.scale = param.scale ? param.scale : 'log';
		this.color = param.colors ? param.colors : ['white'];
		this.text = param.text? param.text : [''];
		this.range = param.range ? param.range : DEF_LOG;
		this.speed = [this.range[0]];	// serves as ping latency
		// internal
		this.targetSpeed = [this.range[0]];
		//this.prevSpeed = [0];
		this.easeSpeed = [DEF_EASE];		
		this.prevRange = this.range;
		this.minval = this.scale == 'log' ? Math.pow(10,this.range[0]) : this.range[0];
		this.peak = [this.range[0]];
	}
	get ping () { return this.speed[0]; }
	set ping (val) {
		//let v = Math.max(Math.min(val, this.range[1]), this.range[0]);
		let v = Math.max(val, this.range[0]);
		while (val > this.range[1])
			this.range[1] += this.range[2];
		this.targetSpeed[0] = (v>10) ? Math.round(v*100)/100 : Math.round(v*1000)/1000;
		this.easeSpeed[0] = DEF_EASE;
	}
	reset() {
		this.range = this.prevRange;
		this.targetSpeed = [this.range[0]];
		//this.prevSpeed = [0];
		this.easeSpeed = [DEF_EASE];
		this._end = false;
		this.peak = [this.range[0]];
	}
	/*Update(elapsed) {
		this.redraw = true;
        return this.update;			
	}*/
	Draw() {
        if (!this.isready) return false;
        if (!this.redraw) return false;		
		
		this.context.clearRect(0,0,this.context.canvas.width,this.context.canvas.height);
		if (this.visible) {
			this.context.save();
			// outer ring
			this.context.beginPath();
			this.context.strokeStyle = "#333";
			this.context.lineWidth = 3;
			this.context.arc(this.center.vx, this.center.vy, this.rect.w/2-10, DEG_HALF_START*Math.PI/180, DEG_HALF_END*Math.PI/180);
			this.context.stroke();
			// units
			this.context.fillStyle = "#FFF";
			this.context.font = "25px MuseoSans_900-webfont";
			this.context.textAlign = "center";
			this.context.fillText(this.text[1], 100, this.rect.h);
			// latency
			this.context.fillStyle = this.color[0];
			this.context.font = "10px MuseoSans_900-webfont";
			this.context.fillText(this.text[0], 100, this.rect.h-60);
			this.context.font = "40px MuseoSans_900-webfont";
			if (this._end) {
				//this.context.shadowBlur = 10;
				//this.context.shadowColor = `Dark${this.color[0]}`;
				this.context.font = "50px MuseoSans_900-webfont";
			}
			let val = this.scale=='log' ? Math.round(Math.pow(10,this.targetSpeed[0])*100)/100 : this.targetSpeed[0];
			this.context.fillText(val<=this.minval?`<${this.minval}`:val, 80, this.rect.h-20);
			// range/grid
			this.context.fillStyle = "#FFF";
			let norm = this.range[1] - this.range[0];	// normalize for non-zero min value
			for (let i=0; i<=Math.ceil(norm/this.range[2])*this.range[2]; i+=this.range[3]) {
				let val = i+this.range[0];
				if (this.scale == 'log') {
					val = Math.pow(10,i+this.range[0]);
					val = (val>=1000) ? `${val/1000}K` : val;
				}
				this.drawTicks(this.calculateAngle(i / norm, DEG_HALF_START, DEG_HALF_END,), i%this.range[2]==0?3:1, i%this.range[2]==0?val:'', this.color[0]);
			}
			// draw ping bar
			this.context.lineWidth = 30;
			this.context.shadowBlur = 20;
			this.context.shadowColor = `Dark${this.color[0]}`;
			this.context.strokeStyle = this.colorGradient[0]; //this.color[0];
			if (this.showPeak) {
				this.context.beginPath();
				this.context.globalAlpha = 0.10;
				this.context.arc(this.center.vx, this.center.vy, this.radius-25, DEG_HALF_START*Math.PI/180, 
							this.calculateAngle((this.peak[0]-this.range[0])/ norm, DEG_HALF_START, DEG_HALF_END));	
				this.context.stroke();
			}
			this.context.beginPath();
			this.context.globalAlpha = 0.75;
			this.context.arc(this.center.vx, this.center.vy, this.radius-25, DEG_HALF_START*Math.PI/180, 
						this.calculateAngle((this.speed[0]-this.range[0])/ norm, DEG_HALF_START, DEG_HALF_END));	
			this.context.stroke();
			this.context.globalAlpha = 1;						
			/* draw ping needle
			this.context.shadowBlur = 0;
			this.context.strokeStyle = this.color[0];
			this.drawNeedle(this.calculateAngle((this.speed[0]-this.range[0])/ norm, DEG_HALF_START, DEG_HALF_END));*/
			this.context.restore();
		}

		this.redraw = false;
		this.update = true;
		return true;		
	}
}

class PieGauge extends HalfGauge {
	Draw() {
        if (!this.isready) return false;
        if (!this.redraw) return false;		
		
		this.context.clearRect(0,0,this.context.canvas.width,this.context.canvas.height);
		if (this.visible) {
			this.context.save();
			// outer ring
			this.context.beginPath();
			this.context.strokeStyle = "#333";
			this.context.lineWidth = 3;
			this.context.arc(this.center.vx, this.center.vy, this.rect.w/2-10, DEG_PIE_START*Math.PI/180, DEG_PIE_END*Math.PI/180, true);
			this.context.stroke();
			// units
			this.context.fillStyle = "#FFF";
			this.context.font = "15px MuseoSans_900-webfont";
			this.context.textAlign = "center";
			this.context.fillText(this.text[1], this.center.vx+60, this.center.vy+60);
			// latency
			this.context.fillStyle = this.color[0];
			this.context.font = "10px MuseoSans_900-webfont";
			this.context.fillText(this.text[0], this.center.vx+60, this.center.vy+45);
			this.context.font = "30px MuseoSans_900-webfont";
			if (this._end) {
				//this.context.shadowBlur = 10;
				//this.context.shadowColor = `Dark${this.color[0]}`;
				this.context.font = "40px MuseoSans_900-webfont";
			}
			this.context.textAlign = "right";			
			let val = this.scale=='log' ? Math.round(Math.pow(10,this.targetSpeed[0])*100)/100 : this.targetSpeed[0];
			this.context.fillText(val<=this.minval?`<${this.minval}`:(val>=1000?`${Math.round(val/10)/100}K`:val), this.center.vx+40, this.center.vy+60);
			// range/grid
			this.context.fillStyle = "#FFF";
			let norm = this.range[1] - this.range[0];	// normalize for non-zero min value
			for (let i=0; i<=Math.ceil(norm/this.range[2])*this.range[2]; i+=this.range[3]) {
				let val = i+this.range[0];
				if (this.scale == 'log') {
					val = Math.pow(10,i+this.range[0]);
					val = (val>=1000) ? `${val/1000}K` : val;
				}
				this.drawTicks(this.calculateAngle(i / norm, DEG_PIE_START, DEG_PIE_END,), i%this.range[2]==0?3:1, i%this.range[2]==0?val:'', this.color[0]);
			}
			// draw ping bar
			this.context.lineWidth = 30;
			this.context.shadowBlur = 20;
			this.context.shadowColor = `Dark${this.color[0]}`;
			this.context.strokeStyle = this.colorGradient[0]; //this.color[0];
			if (this.showPeak) {
				this.context.beginPath();
				this.context.globalAlpha = 0.10;
				this.context.arc(this.center.vx, this.center.vy, this.radius-25, DEG_PIE_START*Math.PI/180, 
							this.calculateAngle((this.peak[0]-this.range[0])/ norm, DEG_PIE_START, DEG_PIE_END), true);	
				this.context.stroke();
			}
			this.context.beginPath();
			this.context.globalAlpha = 0.75;
			this.context.arc(this.center.vx, this.center.vy, this.radius-25, DEG_PIE_START*Math.PI/180, 
						this.calculateAngle((this.speed[0]-this.range[0])/ norm, DEG_PIE_START, DEG_PIE_END), true);	
			this.context.stroke();
			this.context.globalAlpha = 1;						
			/* draw ping needle
			this.context.shadowBlur = 0;
			this.context.strokeStyle = this.color[0];
			this.drawNeedle(this.calculateAngle((this.speed[0]-this.range[0])/ norm, DEG_HALF_START, DEG_HALF_END));*/
			this.context.restore();
		}

		this.redraw = false;
		this.update = true;
		return true;		
	}
}
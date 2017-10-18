// This requires spinner.js
function Loading(idToAttach,idToFade) {
	this.opts = {
		top : '25%',
        lines: 17,
        length: 0,
        width: 5,
        radius: 20,
        speed: 1,
        trail: 35,
        scale:2,
        opacity:0.05 
    };
	this.spinner = new Spinner(this.opts).spin(document.getElementById(idToAttach));
	this.stop = function() {
		this.spinner.stop();
		$('#'+idToFade).fadeTo(1500,1);
	}	
}

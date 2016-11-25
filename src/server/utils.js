
// convert "stringified numbers" (e.g. '10.100') element of arayIn to Numbers
Array.prototype.numberify = function() {
	this.forEach( (elmt, index) => {
	if( !isNaN(elmt) ) 
    	this[index] = Number(this[index]);
    });
};
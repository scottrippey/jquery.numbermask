(function($) {
    
    $.fn.extend({
        toDollarField: function(decimals, min, max) {
            // ToDo: implement min, max
            return this.mask("$#", {decimals:decimals, createBuffer: createNumberBuffer, fillDecimals: true});
        },
        toPercentField: function(decimals, min, max) {
            // ToDo: implement min, max
            return this.mask("#%", {decimals:decimals, createBuffer: createNumberBuffer, fillDecimals: true});
        }
    });
    
    
    function createNumberBuffer(input, mask, settings) {

        // This is a special "buffer" that can be passed to the maskedinput plugin
        // in order to handle "currency formatting" in fields.
            
        // The mask should contain ONLY 1 "#", along with any other "decorations".
        mask = mask.split("#");
        if (mask.length != 2) mask = ["",""];

        var buffer = input.val().split("");
            
        var digit = /[0-9]/;


        // Private functions:

        function formatBuffer(cpos) {
            var coff = 0; // caret offset
            var maxDecim = settings.decimals == undefined ? 0 : settings.decimals;
            var decim = null; // Decimal place
            // Extract all valid characters:
            var digits = [];
            for (var i = 0; i < buffer.length; i++) {
                if (digit.test(buffer[i]) && (decim == null || (digits.length - decim <= maxDecim))) {
                    digits.push(buffer[i]);
                } else if (decim == null && buffer[i] == ".") {
                    decim = digits.length;
                    if (settings.fillDecimals && (maxDecim > 0))
                        digits.push(".");
                }
                else if (cpos > i)
                    coff--; // track the caret as we remove characters.
            }
            cpos += coff; // Offset the caret
            if (decim == null) { // No decimal was found
                decim = digits.length;
                if (settings.fillDecimals && (maxDecim > 0))
                    digits.push(".");
            }

            // Add decimal places if necessary:
            while (settings.fillDecimals && (digits.length - decim <= maxDecim)) {
                digits.push("0");
            }
                
            // Insert commas:
            for (var i = decim-3; i > 0; i-=3) {
                digits.splice(i,0,",");
                if (cpos >= i) cpos++; // track the caret as we add characters.
            }
                
            // Add the mask "decorations":
            cpos += mask[0].length;
            Array.prototype.unshift.apply(digits, mask[0].split("")); // before
            Array.prototype.push.apply(digits, mask[1].split("")); // and after

            // Replace the entire buffer with the new digits:
            digits.unshift(0,buffer.length);
            Array.prototype.splice.apply(buffer,digits);

            return cpos;
        }
        function writeBuffer() {
            input.val(buffer.join('')); 
        };
            
        // "Public" functions, used by maskedinput
        buffer.getText = function() {
            return buffer.join("");
        };
        buffer.insert = function(c) {
            var pos = input.caret();
            // Delete the selection
            if (pos.begin != pos.end) {
                buffer.splice(pos.begin, pos.end-pos.begin);
            }
            // Insert the character:
            buffer.splice(pos.begin,0,c);
            // Update the output:
            var cpos = formatBuffer(pos.begin+1);
            writeBuffer();
            input.caret(cpos);
        };
        buffer.remove = function(dir) {
            var pos = input.caret();
            var cpos;
            // Delete the selection
            if (pos.begin != pos.end) {
                buffer.splice(pos.begin,pos.end-pos.begin);
                cpos = formatBuffer(pos.begin);
            }
            else { // Delete the current character:
                var p = pos.begin;
                if (dir == -1) p--; // "backspace"
                // Find the closest digit to delete:
                while (!digit.test(buffer[p]) && 0 <= p && p < buffer.length) p += dir;
                if (p < 0 || buffer.length <= p) { // Nothing to delete
                    return;
                }
                buffer.splice(p,1);
                cpos = formatBuffer(p);
            }
            // Update the output:
            writeBuffer();
            input.caret(cpos);
        };
        buffer.checkVal = function(allowIncomplete) {
            //try to place characters where they belong
            var pos = input.caret();
            var cpos; // caret position
            var text = input.val().split("");
                
            // Replace the entire buffer with the current value:
            text.unshift(0,buffer.length);
            Array.prototype.splice.apply(buffer, text);
                
            // Update the output:
            cpos = formatBuffer(pos.begin);
            writeBuffer();

            return cpos; // Return the new caret position
        };
            
        return buffer;
    };

})(jQuery);
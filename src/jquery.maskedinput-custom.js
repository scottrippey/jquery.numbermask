/*
	Masked Input plugin for jQuery
	Copyright (c) 2007-2010 Josh Bush (digitalbush.com)
	Licensed under the MIT license (http://digitalbush.com/projects/masked-input-plugin/#license) 
	Version: 1.2.3
*/
(function ($) {
    var pasteEventName = ($.browser.msie ? 'paste' : 'input') + ".mask";
    var iPhone = (window.orientation != undefined);

    $.mask = {
        //Predefined character definitions
        definitions: {
            '9': "[0-9]",
            'a': "[A-Za-z]",
            '*': "[A-Za-z0-9]"
        },
        createBuffer: function (input, mask, settings) {
        /// <summary>
        /// This method creates a "buffer" object that handles
        /// all masking logic.
        /// The "buffer" object has 4 public methods:
        ///   getText() // Returns the un-masked text
        ///   insert(c) // Inserts a character
        ///   remove(d) // Removes a character in the specified direction
        ///   checkVal() // Checks and formats the current value
        /// </summary>

            // Parse the mask, and create the tests:
            var defs = $.mask.definitions;
            var tests = [];
            var partialPosition = null;
            var firstNonMaskPos = null;
            var lastNonMaskPos = null;

            $.each(mask.split(""), function (i, c) {
                if (c == '?') {
                    partialPosition = i;
                } else if (defs[c]) {
                    tests.push(new RegExp(defs[c]));
                    if (firstNonMaskPos == null)
                        firstNonMaskPos = tests.length - 1;
                    lastNonMaskPos = tests.length - 1;
                } else {
                    tests.push(null);
                }
            });
            if (partialPosition == null) {
                partialPosition = lastNonMaskPos;
            }

            var buffer = $.map(mask.split(""), function (c, i) { if (c != '?') return (defs[c] ? (defs[c].placeholder || settings.placeholder) : c); });


            // Private functions:
            function seekNext(pos) {
                while (++pos <= tests.length && !tests[pos]);
                return pos;
            };

            function shiftL(pos) {
                for (var i = pos; i < tests.length; i++) {
                    if (tests[i]) {
                        var j = seekNext(i);
                        buffer[i] = tests[i].placeholder || settings.placeholder;
                        if (j < tests.length && tests[i].test(buffer[j])) {
                            buffer[i] = buffer[j];
                        } else
                            break;
                    }
                }
            };

            function shiftR(pos) {
                for (var i = pos, c = null; i < tests.length; i++) {
                    if (tests[i]) {
                        var j = seekNext(i);
                        var t = buffer[i];
                        buffer[i] = c || tests[i].placeholder || settings.placeholder;
                        if (j < tests.length && tests[j].test(t))
                            c = t;
                        else
                            break;
                    }
                }
            };


            function clearBuffer(start, end) {
                for (var i = start; i < end && i < tests.length; i++) {
                    if (tests[i])
                        buffer[i] = tests[i].placeholder || settings.placeholder;
                }
            };

            function writeBuffer() { input.val(buffer.join('')); };

            buffer.getText = function () {
                return $.map(buffer, function (c, i) {
                    return tests[i] ? c : null;
                }).join('');
            };
            buffer.insert = function (c) {
                var pos = input.caret();
                //delete selection before proceeding
                if (pos.begin != pos.end) {
                    clearBuffer(pos.begin, pos.end);
                }
                var p = seekNext(pos.begin - 1);
                if (p < tests.length) {
                    if (tests[p].test(c)) {
                        shiftR(p);
                        buffer[p] = c;
                        var next = seekNext(p);
                        writeBuffer();
                        input.caret(next);

                        if (settings.completed && next >= tests.length)
                            settings.completed.call(input);
                    }
                }
            };
            buffer.remove = function (d) {
                // From KeyDown:
                var pos = input.caret();
                var npos;
                //delete selection before proceeding
                if (pos.begin != pos.end) {
                    clearBuffer(pos.begin, pos.end);
                    npos = seekNext(pos.begin - 1);
                }
                else { // Delete the current character:
                    var p = pos.begin;
                    if (d == -1) p--; // "backspace"
                    // Find the closest character to delete:
                    while (!tests[p] && 0 <= p && p < tests.length) p += d;
                    if (tests[p]) {
                        shiftL(p);
                        npos = p;
                    } else {
                        npos = pos.begin;
                    }
                }
                writeBuffer();
                input.caret(npos);
            };
            buffer.checkVal = function (allowIncomplete) {
                //try to place characters where they belong
                var pos = input.caret();
                var test = input.val();
                var lastMatch = -1;
                for (var i = 0, p = 0; i < tests.length; i++) {
                    if (tests[i]) {
                        buffer[i] = tests[i].placeholder || settings.placeholder;
                        while (p++ < test.length) {
                            var c = test.charAt(p - 1);
                            if (tests[i].test(c)) {
                                buffer[i] = c;
                                lastMatch = i;
                                break;
                            }
                        }
                        if (p > test.length)
                            break;
                    } else if (buffer[i] == test.charAt(p) && i != partialPosition) {
                        p++;
                        lastMatch = i;
                    }
                }
                if (!allowIncomplete && lastMatch + 1 < partialPosition) {
                    input.val("");
                    clearBuffer(0, buffer.length);
                } else if (allowIncomplete || lastMatch + 1 >= partialPosition) {
                    writeBuffer();
                    if (!allowIncomplete) input.val(input.val().substring(0, lastMatch + 1));
                }

                return (partialPosition ? i : firstNonMaskPos);
            };



            return buffer;
        } // end createBuffer
    };

    $.fn.extend({
        // Helper Function for Caret positioning
        caret: function (begin, end) {
            if (this.length == 0) return;
            if (typeof begin == 'number') {
                end = (typeof end == 'number') ? end : begin;
                return this.each(function () {
                    if (this.setSelectionRange) {
                        this.setSelectionRange(begin, end);
                    } else if (this.createTextRange) {
                        var range = this.createTextRange();
                        range.collapse(true);
                        range.moveEnd('character', end);
                        range.moveStart('character', begin);
                        range.select();
                    }
                });
            } else {
                if (this[0].setSelectionRange) {
                    begin = this[0].selectionStart;
                    end = this[0].selectionEnd;
                } else if (document.selection && document.selection.createRange) {
                    var range = document.selection.createRange();
                    begin = 0 - range.duplicate().moveStart('character', -100000);
                    end = begin + range.text.length;
                }
                return { begin: begin, end: end };
            }
        },
        unmask: function () { return this.trigger("unmask"); },
        mask: function (mask, settings) {
            // If "mask(false)" or no parameters were supplied, return the value without the mask:
            if (!mask && this.length > 0) {
                var input = $(this[0]);
                return input.data("buffer").getText(true);
            }
            // If "mask(true)" was called, let's update the text:
            if (mask === true) {
                var input = $(this[0]);
                return input.data("buffer").checkVal();
            }

            // Default settings:
            settings = $.extend({
                placeholder: "_",
                completed: null
            }, settings);

            return this.each(function () {
                var input = $(this);
                // Store the initial value of the text (for when the user presses Escape, and to fire Change events):
                var focusText = input.val();

                // Create the buffer:
                var createBuffer = (settings.createBuffer || $.mask.createBuffer); // Gets the function that will create our buffer (unless it was overridden)
                var buffer = createBuffer(input, mask, settings);
                // Store the buffer:
                input.data("buffer", buffer);

                // Perform initial check for existing values:
                buffer.checkVal();




                // Variable for ignoring control keys:
                var ignore = false;

                // Bind the events:
                if (input.attr("readonly")) return;

                input
			    .one("unmask", function () {
			        input
					    .unbind(".mask")
					    .removeData("buffer")
					    .removeData("tests");
			    })
			    .bind("focus.mask", function () {
			        focusText = input.val();
			        var pos = buffer.checkVal(true);
                    var moveCaret = function(){
                        if (pos == buffer.length)
                            input.caret(0,pos);
                        else
                            input.caret(pos);
                    };
                    $.browser.msie ? moveCaret() : setTimeout(moveCaret,0);
			    })
			    .bind("blur.mask", function () {
			        buffer.checkVal(false);
			        if (input.val() != focusText)
			            input.change();
			    })
				.bind("keydown.mask", function (e) {
				    var k = e.keyCode;
				    ignore = (k < 16 || (k > 16 && k < 32) || (k > 32 && k < 41));

				    // backspace, delete, and escape get special treatment
				    if (k == 8 || k == 46 || (iPhone && k == 127)) { // backspace/delete
				        buffer.remove((k == 46 ? 1 : -1));
				        return false;
				    } else if (k == 27) {// escape
				        input.val(focusText);
				        var pos = buffer.checkVal();
				        if (pos == buffer.length)
				            input.caret(0, pos);
				        else
				            input.caret(pos);
				        return false;
				    }
				})
				.bind("keypress.mask", function (e) {
				    if (ignore) {
				        ignore = false;
				        // Fixes Mac FF bug on backspace
				        return (e.keyCode == 8) ? false : null;
				    }
				    e = e || window.event; // (unnecessary? jQuery does this automatically?)
				    var k = e.charCode || e.keyCode || e.which;
				    if (e.ctrlKey || e.altKey || e.metaKey || e.charCode === 0) { // Ignore
				        return true;
				    } else if ((k >= 32 && k <= 125) || k > 186) { // typeable characters
				        var c = String.fromCharCode(k);
				        buffer.insert(c);
				    }
				    return false;
				})
				.bind(pasteEventName, function () {
				    setTimeout(function () {
				        var pos = buffer.checkVal(true);
				        input.caret(pos);
				    }, 0);
				});

            });
        }
    });
})(jQuery);
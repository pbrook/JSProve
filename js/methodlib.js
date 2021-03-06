// Hopefully never need to use this
var MAX_RANK = 24
var bell_names = "1234567890ET";

/**
 * Method Object
 * @author Paul Brook
 */
function Method(rank, name, rows) {
    var lead_end = rows.pop();
    var that = {
        rank:rank,
        name:name,
        rows:rows,
        lead_end:lead_end
    };
    return that;
}

/**
 * Change Object - represents a row and advances to the next row or next lead
 * @author Paul Brook
 */
function Change(rank) {
    var i;
    var that = {
        rank:rank
    };
    that.row = new Array(rank);
    for (i = 0; i < rank; i++) {
        that.row[i] = i;
    }

    that.advance = function (mask) {
        var i = 0;
        var tmp;
        while (i < rank) {
            if ((mask & 1) === 0) {
                tmp = this.row[i];
                this.row[i] = this.row[i + 1];
                this.row[i + 1] = tmp;
                mask >>= 2;
                i += 2;
            } else {
                mask >>= 1;
                i++;
            }
        }

    };

    that.advance_lead = function (method, call, fn) {
        var mask;
        var n;

        if (call === -1) {
            call = method.lead_end;
        }
        for (n = 0; n < method.rows.length; n++) {
            mask = method.rows[n];
            this.advance(mask, false);
            fn(this);
        }
        this.advance(call, true);
        fn(this);
    };

    that.pp = function () {
        var s = "";
        for (i = 0; i < this.rank; i++) {
            s += bell_names[this.row[i]];
        }
        return s;
    };

    that.setRow = function (newRow) {
        this.row = newRow;
    }

    return that;
}

// map human bell names to bell indexes
function bell_index(name) {
    if (name >= '1' && name <= '9') {
        return parseInt(name, 10) - 1;
    }
    if (name === '0') {
        return 9;
    }
    if (name === 'E') {
        return 10;
    }
    if (name === 'T') {
        return 11;
    }
    if(name === '*') {
        return -1;
    }
    return -1;
}

// map bell indexes to human bell names
function bell_name(index) {
    if(index === -1) {
        return "*";
    }
    if(index > -1 && index < 9) {
        return (index+1).toString();
    }
    if(index === 9) {
        return '0';
    }
    if(index === 10) {
        return 'E';
    }
    if(index === 11) {
        return 'T';
    }
    return index;
}

/**
 * Generate a row
 * @author Paul Brook
 */
function parse_bell_list(rank, n, notation) {
    var mask = 0;
    var last_bell = -1;
    var c;
    var bell;

    while (n < notation.length) {
        c = notation.charAt(n);
        if (c === '.') {
            n++;
            break;
        }
        bell = bell_index(c);
        if (bell === -1) {
            break;
        }
        if (mask === 0 && (bell & 1) === 1) {
            mask = 1;
        }
        mask |= 1 << bell;
        last_bell = bell;
        n++;
    }
    if ((last_bell & 1) === 0) {
        mask |= 1 << (rank - 1);
    }
    return {
        n:n,
        mask:mask
    };
}

// function to decide which parsing method to use
function parse_method(rank, notation) {
    if((notation.indexOf("&") === -1) && (notation.indexOf("+") === -1)) {
        return parse_method_cc(rank, notation);
    } else {
        var group = notation.charAt(0);
        var not = notation.substring(2);
        return parse_method_microsiril(rank, group, not);
    }
}

/**
 * Parse method notation as used by MicroSIRIL libraries
 * @author Paul Brook
 */
function parse_method_microsiril(rank, group, notation) {
    function get_mask(rank, n, notation) {
        if (notation.charAt(n) === "-") {
            return {
                n:n+1,
                mask:0
            };
        }
        return parse_bell_list(rank, n, notation);
    }
    var symmetric;
    var c;
    c = notation.charAt(0);
    if (c === '&') {
        symmetric = true;
    } else if (c === '+') {
        symmetric = false;
    } else {
        throw "Unexpected notation (expected + or &):" + notation;
    }
    var res;
    var n = 1;
    var rows = [];
    var lead_end;

    while (n < notation.length) {
        res = get_mask(rank, n, notation);
        if (res.n === n) {
            throw "Bad place notation";
        }
        n = res.n;
        rows.push(res.mask);
    }
    if (symmetric) {
        for (n = rows.length - 2; n >= 0; n--) {
            rows.push(rows[n]);
        }
    }

    c = group.charAt(0);
    if (group.charAt(group.length - 1) === 'z') {
        res = parse_bell_list(rank, 0, group);
        if (res.n !== res.length) {
            throw "Bad method group: " + group;
        }
        lead_end = res.mask;
    } else if ((c >= 'a' && c <= 'f')
        || c === 'p' || c === 'q') {
        lead_end = 3;
    } else if ((c >= 'g' && c <= 'm')
        || c === 'r' || c === 's') {
        lead_end = 1 | (1 << (rank - 1));
    } else {
        throw "Bad method group: " + group;
    }
    rows.push(lead_end);
    return rows;
}

/**
 * Parse method notation as used in Central Council XML files
 * @author Paul Brook
 */
function parse_method_cc(rank, notation) {
    function get_mask(rank, n, notation) {
        if (notation.charAt(n) === "-") {
            return {
                n:n+1,
                mask:0
            };
        }
        return parse_bell_list(rank, n, notation);
    }
    var res;
    var n = 0;
    var sep;
    var lead_end;
    var rows = [];

    sep = notation.indexOf(",");
    if (sep === -1)
        sep = notation.length;
    while (n < sep) {
        res = get_mask(rank, n, notation);
        if (res.n === n) {
            throw "Bad place notation";
        }
        n = res.n;
        rows.push(res.mask);
    }
    if (sep !== notation.length) {
        for (n = rows.length - 2; n >= 0; n--) {
            rows.push(rows[n]);
        }
        res = parse_bell_list(rank, sep + 1, notation);
        rows.push(res.mask);
    }
    return rows;
}

/**
 * Composition Object
 * @author Paul Brook, modified by James Holdsworth to allow spliced
 */
function Composition() {
    var that = {
        methods:[],
        calls:[],
        leadends:[],
        rank:0
    };

    that.append_lead = function (method, call) {
        this.methods.push(method);
        this.calls.push(call);
        if (method.rank > this.rank) {
            this.rank = method.rank;
        }
    };

    that.run = function (fn) {
        var ch = Change(this.rank);
        var method;
        var call;
        for (a = 0; a < this.methods.length; a++) {
            method = this.methods[a];
            call = this.calls[a];
            ch.advance_lead(method, call, fn);
            this.leadends[a] = ch.row.slice(0);
        }
    };
    return that;
}

/**
 * Shorthand Object
 * @author James Holdsworth
 * @todo Remove hard coding of symbols
 */
function Shorthand(shorthand, method) {
    var that = {
        shorthandCalls:shorthand,
        rank:method.rank,
        compText:"",
        method:method,
        bob:null,
        single:null
    };

    that.run = function(fn, b, s) {
        this.bob = b;
        this.single = s;
        var bob = parse_bell_list(this.rank, 0, b[1]);
        var single = parse_bell_list(this.rank, 0, s[1]);
        var c = Change(this.rank);
        // loop through the calls and for each one, work out its meaning
        for(i=0; i<this.shorthandCalls.length; i++) {
            if(this.shorthandCalls.charAt(i) === "s") {
                // it's a single
                i++;
                this.ringToNextCall(this.shorthandCalls[i], single, fn, true, c);
            } else {
                this.ringToNextCall(this.shorthandCalls[i], bob, fn, false, c);
            }
        }
    };

    // returns number of leads until you insert the next call
    that.ringToNextCall = function(call, callType, fn, isSingle, c) {
        var moreLeads = true;
        var tenorPosition = bell_index(call);
        // couldn't find index
        if(tenorPosition < 1) {
            call = call.toLowerCase();
            switch(call) {
                case "h":
                    tenorPosition = this.rank-1;
                    break;
                case "w":
                    tenorPosition = this.rank-2;
                    break;
                case "m":
                    tenorPosition = this.rank-3;
                    break;
                case "i":
                    // won't this break if using n-2 place calls?
                    if(isSingle) {
                        // single 3rds
                        tenorPosition = 2;
                    } else {
                        // run in
                        tenorPosition = 1;
                    }
                    break;
                case "b":
                case "o":
                    if(isSingle) {
                        tenorPosition = 1;
                    } else {
                        tenorPosition = 2;
                    }
                    break;
                case "t":
                    tenorPosition = 2;
                    break;
                case "f":
                    tenorPosition = 3;
                    break;
                case "v":
                    tenorPosition = 4;
                    break;
                default:
                    throw "Calling Position " + call + " not found";
            }
        }

        if(tenorPosition >= this.rank) {
            throw "Tenor doesn't get to this position in a "+this.rank+"-bell method";
        }
        while(moreLeads === true) {
            var previousLeadHead = c.row.slice(0);
            c.advance_lead(this.method, callType.mask, fn);
            var thisLeadhead = c.row.slice(0);
            this.compText += this.method.name;
            // if tenor's in that position with a call
            if(thisLeadhead[tenorPosition] === (this.rank-1)) {
                moreLeads = false;
                if(isSingle === false) {
                    this.compText += this.bob[0];
                } else {
                    this.compText += this.single[0];
                }
            } else { // tenor's not in specified position, undo the call and move on a lead
                c.setRow(previousLeadHead);
                c.advance_lead(this.method, this.method.lead_end, fn);
            }
            // if the tenor's home, put a line break in
            if(c.row.indexOf(this.rank-1) === (this.rank-1)) {
                this.compText += "\n";
            }
        }
    };
    return that;
}

/**
 * ATW checker object
 * @author James Holdsworth
 */
function AtwChecker(comp) {
    // build an array like Method[bellNo][position] = true
    var that = {
        comp:comp,
        positionsRung:[],
        methodList:'',
        com:0
    }

    that.getAtw = function() {
        for (i=0; i < this.comp.methods.length; i++) {
            // add the method symbol to the list
            this.methodList += this.comp.methods[i].name;
            this.positionsRung[this.comp.methods[i].name] = [];
            // add the bell to the list
            for (j=0; j < this.comp.rank; j++) {
                this.positionsRung[this.comp.methods[i].name][bell_names[j]] = [];
                // add the bell's position to the list
                for (k=0; k < this.comp.rank; k++) {
                    this.positionsRung[this.comp.methods[i].name][bell_names[j]][bell_names[k]] = false;
                }
            }
        }

        // for each lead
        for (i=0; i < this.comp.methods.length; i++) {
            // loop through the number of bells
            for (j=0; j < this.comp.rank; j++) {
                // bell at this position in the lead
                leadend = this.comp.leadends[i-1];
                // note we can't use leadend-1 for the first lead, so generate a lead of rounds and use that
                if (leadend === undefined) {
                    leadend = [];//this.comp.leadends[this.comp.methods.length - 1];
                    for (k=0; k < this.comp.rank; k++) {
                        leadend.push(k);
                    }
                }
                this.positionsRung[this.comp.methods[i].name][bell_names[leadend[j]]][bell_names[j]] = true;
            }
        }

        // count changes of method
        var previousLeadMethod = this.methodList[0];
        // ends up comparing the first lead against the first lead - probably OK
        for (i=0; i < this.methodList.length; i++) {
            if (this.methodList[i] != previousLeadMethod) {
                this.com++;
            }
            previousLeadMethod = this.methodList[i];
        }
    };

    return that;
}

/**
 * Prover Object - prove the rows are unique
 * @author Paul Brook
 */
function Prover() {
    that = {
        changes:{}
    };

    that.check_row = function (c) {
        var val = 0;
        var rank = c.rank;
        var row = new Array(rank);
        var n;
        var i;
        var j;
        var bell;
        var seen = false;

        for (i = 0; i < rank; i++) {
            row[i] = c.row[i];
        }
        n = rank;
        for (i = 0; i < rank; i++) {
            bell = row[i];
            for (j = i + 1; j < rank; j++) {
                if (row[j] > bell) {
                    row[j]--;
                }
            }
            val = val * n + bell;
        }
        seen = this.changes[val] === true;
        this.changes[val] = true;
        if (seen) {
            return -1;
        }
        if (val === 0) {
            return 1;
        }
        return 0;
    };

    return that;
}

/**
 * MusicBox object
 * @author Paul Brook
 */
function MusicBox() {
    var that = {
        patterns:[],
        counts:[]
    };
    var node_done;
    var stack;
    var objtree;

    that.add_pattern = function (pattern) {
        this.patterns.push(pattern);
        this.counts.push(0);
    };

    that.setup = function (rank) {
        var pattern;
        var node;
        var bell;

        node_done = new Array(rank);
        stack = new Array(rank);
        objtree = {};

        for (n = 0; n < this.patterns.length; n++) {
            pattern = this.patterns[n];
            if (pattern.length != rank) {
                continue;
            }
            node = objtree;
            for (i = 0; i < rank; i++) {
                bell = pattern[i];
                if (bell in node) {
                    next_node = node[bell];
                } else {
                    next_node = {};
                    node[bell] = next_node;
                }
                node = next_node;
            }
            node.pattern = n;
        }
    };

    that.match_row = function (c) {
        var rank = c.rank;
        var i;
        var node;

        i = 0;
        node = objtree;
        node_done[0] = !(-1 in node);
        while (true) {
            // walk left along exact matches
            while (c.row[i] in node) {
                stack[i] = node;
                node = node[c.row[i]];
                i++;
                node_done[i] = !(-1 in node);
            }
            // Check if this is an end node
            if (i == rank) {
                this.counts[node.pattern]++;
            }
            // Try right shuffle along wildcard
            if (!node_done[i]) {
                stack[i] = node;
                node_done[i] = true;
                node = node[-1];
                i++;
                node_done[i] = !(-1 in node);
            } else {
                // backtrack until we find another right branch
                while (i > 0 && node_done[i]) {
                    i--;
                }
                if (node_done[i]) {
                    break;
                }
                node_done[i] = true;
                node = stack[i][-1];
                i++;
                node_done[i] = !(-1 in node);
            }
        }
    };

    return that;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSeatingLayout = void 0;
var generateSeatingLayout = function (rows, columns, basePrice) {
    if (basePrice === void 0) { basePrice = 50; }
    var seats = [];
    for (var i = 0; i < rows; i++) {
        var rowLabel = String.fromCharCode(65 + i); // A, B, C...
        // Logic: First 2 rows are VIP, next 3 are Premium, rest are Standard
        var tier = 'standard';
        var price = basePrice;
        if (i < 2) {
            tier = 'vip';
            price = basePrice * 3; // VIP is 3x base price
        }
        else if (i < 5) {
            tier = 'premium';
            price = basePrice * 2; // Premium is 2x base price
        }
        for (var j = 1; j <= columns; j++) {
            seats.push({
                id: "".concat(rowLabel, "-").concat(j),
                rowLabel: rowLabel,
                number: j,
                status: 'available',
                tier: tier,
                price: price,
            });
        }
    }
    return {
        rows: rows,
        columns: columns,
        seats: seats,
    };
};
exports.generateSeatingLayout = generateSeatingLayout;

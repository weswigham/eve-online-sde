const expect = require("chai").expect;
const eve = require("../");

describe("the eve sde access", () => {
    it("can access items by id", () => {
        return eve.lookupByID(34).then(trit => {
            expect(trit).to.not.be.undefined;
            expect(trit.name.en).to.equal("Tritanium");
        });
    });
    it("can access items by name", () => {
        return eve.lookup("Trit").then(trit => {
            expect(trit).to.not.be.undefined;
            expect(trit.id).to.equal(34);
        });
    });
});
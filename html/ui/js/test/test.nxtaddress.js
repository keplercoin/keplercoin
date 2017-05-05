QUnit.module("KPL-.address");

QUnit.test("KPL-Address", function (assert) {
    var address = new KplAddress();
    assert.equal(address.set("KPL-XK4R-7VJU-6EQG-7R335"), true, "valid address");
    assert.equal(address.toString(), "KPL-XK4R-7VJU-6EQG-7R335", "address");
    assert.equal(address.set("KPL-XK4R-7VJU-6EQG-7R336"), false, "invalid address");
});

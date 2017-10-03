/* eslint-disable import/no-extraneous-dependencies, no-unused-expressions */
const expect = require('chai').expect;

const utils = require('../../util');

describe('util/index.js', () => {
    describe('findClientId()', () => {
        it('should return id with length 12 and readable', () => {
            const id = utils.findClientId();

            expect(id).to.have.lengthOf(12);
            expect(/[Il0O]/.test(id)).to.be.false;
        });
    });

    describe('randomInt()', () => {
        it('should return int and between args', () => {
            const int = utils.randomInt(1, 10);

            expect(int).to.be.a('number');
            expect(int).to.be.within(1, 10);
        });
    });

    describe('getValueByPath()', () => {
        it('should return value by path', () => {
            const variable = utils.getValueByPath({ a: { b: 1 } }, 'a.b');

            expect(variable).to.equal(1);
        });
    });

    describe('setValueByPath()', () => {
        it('should set value by path', () => {
            const obj = {};
            const obj2 = utils.setValueByPath(obj, 'a.b', 2);

            expect(obj).to.deep.equal({ a: { b: 2 } });
            expect(obj2).to.deep.equal({ a: { b: 2 } });
        });
    });

    describe('deleteByPath()', () => {
        it('should delete value by path', () => {
            const obj = { a: { b: 2 }, c: 2 };
            utils.deleteByPath(obj, 'a.b');

            expect(obj).to.deep.equal({ a: {}, c: 2 });
        });
    });

    describe('arraysEqual()', () => {
        it('should compare to equal arrays as true', () => {
            expect(utils.arraysEqual([1], [1])).to.be.true;
        });

        it('should compare to non equal arrays as false', () => {
            expect(utils.arraysEqual([1], [2])).to.be.false;
            expect(utils.arraysEqual([1, 1], [2])).to.be.false;
        });
    });

    // describe('setValueByPath()', () => {});
    // describe('setValueByPath()', () => {});
});

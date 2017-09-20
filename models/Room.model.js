const Model = global.req('classes/Model.class');

module.exports = class RoomModel extends Model {
    constructor(data) {
        super('Room', {
            name: {
                type: String,
                required: true,
            },
        });

        super.new(data);
    }
};

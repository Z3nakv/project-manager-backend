import mongoose, {Schema, Document} from "mongoose";

export interface IUser extends Document {
    email: string,
    password: string,
    name: string,
    confirmed: boolean,
    authProvider: 'local' | 'google'
    googleId?: string
}

const userSchema : Schema = new Schema ({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        unique: true
    },
    password: {
        type: String,
        required: function (this: IUser) {
            return this.authProvider === 'local'
        }
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    googleId: {
        type: String,
        default: null,
        sparse: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    confirmed: {
        type: Boolean,
        default: false
    }
})

const User = mongoose.model<IUser>('User', userSchema);
export default User;
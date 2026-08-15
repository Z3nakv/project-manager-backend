import mongoose, {Schema, Document} from "mongoose";

export interface IUser extends Document {
    email: string,
    password: string,
    name: string,
    confirmed: boolean,
    authProvider: 'local' | 'google'
    googleId?: string,
    isEphemeralDemo: boolean,
    avatarUrl?: string,
    avatarPublicId?: string
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
    },
    isEphemeralDemo: {
        type: Boolean,
        default: false
    },
    avatarUrl: {
        type: String,
        default: null
    },
    avatarPublicId: {
        type: String,
        default: null
    }
}, {timestamps: true});

userSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 2 * 60 * 60, partialFilterExpression: { isEphemeralDemo: true } }
);

const User = mongoose.model<IUser>('User', userSchema);
export default User;
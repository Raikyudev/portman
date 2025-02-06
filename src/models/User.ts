import mongoose, {Document, Schema} from 'mongoose';


interface IUserPreferences{
    currency: string;
}
export interface IUser extends Document{
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    preferences: IUserPreferences;
}

const userSchema:Schema = new mongoose.Schema({
    username:{
        type: String,
        required: true,
    },
    first_name:{
        type: String,
        required: true,
    },
    last_name:{
        type: String,
        required: true,
    },
    email:{
        type: String,
        required: true,
    },
    password:{
        type: String,
        required: true,
    },
    preferences:{
        currency: { type: String, required: true, default: 'GBP' }
    }
});

const User = mongoose.model<IUser>('User', userSchema);

export default User;
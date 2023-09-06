import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    id: { type: String, required: true },
    usernames: { type: String, required: true, unique: true },
    names: { type: String, required: true },
    image: String,
    bio: String,
    threads: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Threads'
    }],

    onboarded: {
        type: Boolean,
        default: false
    },
    community: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Community'
    }]
})

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
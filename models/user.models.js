import mongoose  from "mongoose";

const userSchema = new mongoose.Schema({
    fullName:{
        type:String,
        require:[true,"Name is required"]
    },
    email:{
        type:String,
        require:[true,"Email is required"],
        unique:true
    },
    password:{
        type:String,
        require:[true,"Password is required"]
    },
    contactNumber:{
        type:String,
        default:null
    },
    forgot_password_otp:{
        type:String,
        default:null
    },
    forgot_password_expiry:{
        type:Date,
        default:""
    },
    role:{
        type:String,
        enum:["ADMIN","USER"],
        default:"USER"
    }
},{timestamps:true});

const userModel = mongoose.model("User",userSchema);

export default userModel;
import { model, Schema, Document } from 'mongoose';

const UserToken = new Schema(
  {
    user: {
        type: String,
        required: true,
    },
    token: { 
        type: Schema.Types.ObjectId, 
        ref: "Token" 
    },
    balance:{
        type: Number
    },
    initialised:{
      type: Boolean,
      default: false
    }
  },
  { timestamps: true },
);

export default model<Document>('UserToken', UserToken);

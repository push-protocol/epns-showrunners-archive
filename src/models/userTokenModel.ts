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
    }
  },
  { timestamps: true },
);

export default model<Document>('UserToken', UserToken);

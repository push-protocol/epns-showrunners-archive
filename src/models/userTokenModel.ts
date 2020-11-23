import { model, Schema, Document } from 'mongoose';

const UserToken = new Schema(
  {
    user: {
        type: String,
        required: true,
    },
    ticker: { 
        type: String,
        required: true, 
    },
    balance:{
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

export default model<Document>('UserToken', UserToken);

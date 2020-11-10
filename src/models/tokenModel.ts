import { model, Schema, Document } from 'mongoose';

const Token = new Schema(
  {
    address: {
      type: String,
      required: true,
      unique: true,
    },
    symbol: {
        type: String,
        required: true,
    },
    decimals: {
        type: Number,
        required: true,
    },
  },
  { timestamps: true },
);

export default model<Document>('Token', Token);

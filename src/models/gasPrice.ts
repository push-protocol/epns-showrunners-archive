import { model, Schema, Document } from 'mongoose';
import { IGas } from '../interfaces/IGas';

const GasPrice = new Schema(
  {
    price: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

export default model<IGas & Document>('GasPrice', GasPrice);

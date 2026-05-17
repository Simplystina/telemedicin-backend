import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { PaymentableType } from '../entities/payment.entity';

export class InitializePaymentDto {
  @IsInt()
  paymentableId: number; // subscription or appointment ID

  @IsEnum(PaymentableType)
  paymentableType: PaymentableType;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string; // 'NGN' | 'USD'
}

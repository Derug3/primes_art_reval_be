import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@ObjectType()
export class DiscordRole {
  @Field()
  roleId: number;
  @Field()
  roleName: string;
}

@ObjectType()
@Entity()
export class User {
  @PrimaryColumn()
  @Field()
  discordId: string;
  @Column()
  @Field()
  discordUsername: string;
  @Field(() => [String])
  @Column({ type: 'simple-array' })
  wallets: string[];
  @Field(() => [DiscordRole])
  @Column({ type: 'jsonb' })
  userRoles: DiscordRole[];
  @Field({ nullable: true })
  @Column({ nullable: true })
  userTwitterName: string;
}

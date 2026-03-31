import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Link } from '../links/link.entity';

@Entity('tags')
@Unique(['slug', 'userId'])
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.tags, { onDelete: 'CASCADE' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToMany(() => Link, (link) => link.tags)
  links: Link[];
}

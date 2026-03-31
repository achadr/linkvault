import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Link } from '../links/link.entity';
import { Tag } from '../tags/tag.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  password: string | null;

  @Column({ type: 'varchar', nullable: true })
  googleId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Link, (link) => link.user)
  links: Link[];

  @OneToMany(() => Tag, (tag) => tag.user)
  tags: Tag[];
}

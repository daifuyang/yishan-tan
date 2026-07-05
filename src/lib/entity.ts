export type TimestampFields = {
  createdAt: Date;
  updatedAt: Date;
};

export type SoftDeleteFields = {
  deletedAt: Date | null;
};

export type BaseEntity = TimestampFields & SoftDeleteFields;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address" TEXT,
ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "googleid" TEXT,
ADD COLUMN     "occupation" TEXT,
ALTER COLUMN "name" DROP NOT NULL;

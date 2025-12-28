import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/db';
import EditForm from './EditForm';

export default async function EditPortfolioPage({ params }: { params: { id: string } }) {
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: params.id },
  });

  if (!portfolio) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Edit Portfolio</h1>
        <p className="mt-2 text-sm text-gray-600">
          Update the name and description for this portfolio.
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <EditForm portfolio={portfolio} />
        </div>
      </div>
    </div>
  );
}

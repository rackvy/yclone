import Layout from '../components/Layout';
import Link from '../components/Link';

export default function ForbiddenPage() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="text-6xl font-bold text-red-500 mb-4">403</div>
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">Доступ запрещён</h1>
        <p className="text-gray-600 mb-6 text-center max-w-md">
          У вас недостаточно прав для просмотра этой страницы.
          Обратитесь к администратору, если вам нужен доступ.
        </p>
        <Link
          href="/"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          На главную
        </Link>
      </div>
    </Layout>
  );
}

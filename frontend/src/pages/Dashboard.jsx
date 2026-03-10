import PatientsTable from "../components/PatientsTable"
export default function Dashboard() {

  return (

    <div>

      <h1 className="text-2xl font-semibold mb-6">
        Клиническая панель
      </h1>

      <div className="grid grid-cols-4 gap-6">

        <div className="bg-white p-6 rounded shadow">
          <p className="text-gray-500">Всего пациентов</p>
          <h2 className="text-3xl font-bold">8</h2>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <p className="text-gray-500">Высокий риск</p>
          <h2 className="text-3xl text-red-500 font-bold">3</h2>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <p className="text-gray-500">Средний риск</p>
          <h2 className="text-3xl text-yellow-500 font-bold">2</h2>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <p className="text-gray-500">Приемов сегодня</p>
          <h2 className="text-3xl text-blue-500 font-bold">12</h2>
        </div>

      </div>

    </div>

  )

}
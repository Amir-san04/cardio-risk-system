export default function PatientsTable() {

  const patients = [
    {
      name: "Алидар Балабиев",
      age: 21,
      visit: "5 Feb 2026",
      risk: "high"
    },
    {
      name: "Санатов Амир",
      age: 21,
      visit: "4 Feb 2026",
      risk: "medium"
    },
    {
      name: "Артем Кан",
      age: 45,
      visit: "3 Feb 2026",
      risk: "low"
    }
  ]

  const riskColor = (risk) => {

    if (risk === "high") return "bg-red-100 text-red-600"
    if (risk === "medium") return "bg-yellow-100 text-yellow-600"

    return "bg-green-100 text-green-600"
  }

  return (

    <div className="bg-white rounded shadow p-6 mt-8">

      <h2 className="text-lg font-semibold mb-4">
        Список пациентов по уровню риска
      </h2>

      <table className="w-full">

        <thead className="border-b text-left">

          <tr>
            <th className="py-2">Имя</th>
            <th>Возраст</th>
            <th>Последний визит</th>
            <th>Уровень риска</th>
          </tr>

        </thead>

        <tbody>

          {patients.map((p, i) => (

            <tr key={i} className="border-b">

              <td className="py-3">{p.name}</td>
              <td>{p.age}</td>
              <td>{p.visit}</td>

              <td>

                <span className={`px-3 py-1 rounded ${riskColor(p.risk)}`}>

                  {p.risk}

                </span>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  )

}
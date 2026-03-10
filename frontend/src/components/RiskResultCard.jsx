export default function RiskResultCard({ result }) {

  if (!result) return null

  const riskColor = () => {

    if (result.risk_level === "high")
      return "text-red-600"

    if (result.risk_level === "medium")
      return "text-yellow-600"

    return "text-green-600"

  }

  return (

    <div className="bg-white rounded shadow p-6 mt-6">

      <h2 className="text-lg font-semibold mb-4">
        Результат анализа
      </h2>

      <p>
        Risk Level:
        <span className={`ml-2 font-bold ${riskColor()}`}>
          {result.risk_level}
        </span>
      </p>

      <p className="mt-2">
        Risk Score:
        <b className="ml-2">
          {result.risk_score}
        </b>
      </p>

      <div className="mt-4">

        <p className="font-semibold">
          Recommendations
        </p>

        <ul className="list-disc ml-6">

          {result.recommendations.map((r, i) => (
            <li key={i}>{r}</li>
          ))}

        </ul>

      </div>

    </div>

  )

}
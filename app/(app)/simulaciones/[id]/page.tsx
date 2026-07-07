import { LoanResults } from "@/components/loans/loan-results";

export default async function SimulacionPage(
  props: PageProps<"/simulaciones/[id]">,
) {
  const { id } = await props.params;
  return <LoanResults loanId={id} />;
}

// Task

// List out the computational inefficiencies and anti-patterns found in the code block below.

// 1. This code block uses
//     a. ReactJS with TypeScript.
//     b. Functional components.
//     c. React Hooks
// 2. You should also provide a refactored version of the code, but more points are awarded to accurately stating the issues and explaining correctly how to improve them. 


//Mising "blockchain" on WalletBalance
interface WalletBalance {
  currency: string;
  amount: number;
}


interface FormattedWalletBalance {
  currency: string;
  amount: number;
  formatted: string;
}

// Unnecessary type declaration for Props. Because it doens't add anything to BoxProps. Declaring an empty interface is redundant.
interface Props extends BoxProps {

}

// Children are destructured but never used. Unnecessary double typing of Props. Only need to specify Props once.
const WalletPage: React.FC<Props> = (props: Props) => {
  const { children, ...rest } = props;
  const balances = useWalletBalances();
  const prices = usePrices();


// getPriority argument type is any instead of Blockchain, it throws away type safety and lets bad values. Magic Numbers in getPriority can be extracted into a constant mapping for better readability and maintainability.
  const getPriority = (blockchain: any): number => {
    switch (blockchain) {
      case 'Osmosis':
        return 100
      case 'Ethereum':
        return 50
      case 'Arbitrum':
        return 30
      case 'Zilliqa':
        return 20
      case 'Neo':
        return 20
      default:
        return -99
    }
  }

  // Mis-using useMemo. useMemo here is likely premature optimization. If used, the dependencies should be minimal and correct. prices is in the dependency array but never used inside the memoized function. This will cause unnecessary recomputations when prices changes. 
  const sortedBalances = useMemo(() => {
    return balances.filter((balance: WalletBalance) => {

      // Undefined behavior: lhsPriority is not defined. It should be balancePriority.
      const balancePriority = getPriority(balance.blockchain);

      // Wrong comparison: should compare balancePriority to 0, not lhsPriority to -99. Keeps zero or negative balances instead of positive ones. 
      if (lhsPriority > -99) {
        if (balance.amount <= 0) {
          return true;
        }
      }
      return false

      // Comparator function is wrong. It doesn't handle the equality. When priorities are equal, it returns undefined which is not a valid return type for a comparator function.
    }).sort((lhs: WalletBalance, rhs: WalletBalance) => {
      const leftPriority = getPriority(lhs.blockchain);
      const rightPriority = getPriority(rhs.blockchain);
      if (leftPriority > rightPriority) {
        return -1;
      } else if (rightPriority > leftPriority) {
        return 1;
      }
    });
  }, [balances, prices]);


// sortedBalances elements are WalletBalance, but treated as FormattedWalletBalance. Lack of explicit formatting rule. toFixed() without specifying decimal places. It should be toFixed(2) or similar for currency formatting.
  const formattedBalances = sortedBalances.map((balance: WalletBalance) => {
    return {
      ...balance,
      formatted: balance.amount.toFixed()
    }
  })


// rows maps over sortedBalances instead of formattedBalances, but casts the elements to FormattedWalletBalance. balance.formatted doesn't actually exist, so this is a bug and a type lie. Using array index as key is an anti-pattern, should use a stable unique key instead. It can cause incorrect re-use of components and bugs in rendering.
  const rows = sortedBalances.map((balance: FormattedWalletBalance, index: number) => {
    const usdValue = prices[balance.currency] * balance.amount;
    return (
      <WalletRow
        className={classes.row}
        key={index}
        amount={balance.amount}
        usdValue={usdValue}
        formattedAmount={balance.formatted}
      />
    )
  })

  return (
    <div {...rest}>
      {rows}
    </div>
  )
}
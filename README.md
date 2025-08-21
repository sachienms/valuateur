# Requirements 

## Description
Name of the app is "valuateur". It allows users to evaluate any stocks globally using different methods. for starting this app only provide Free Cash Flow to Firm (FCFF) method of evaluation, but there should be provision to incorporate other methods as well

## Features
User need to login to use the app. Login can be google login or email login. There will be free version as well as subscription option. Free version will not allow user to store the history of valuation that particular user did in the past. Only last stock valuation detail will be visible. If the free user want to evaluate another stock, then it will override the previous valuation. Whereas subscription user will be able to store the past valuated stocks in differet watchlists. Ther can be maximum of 10 watchlist and 20 stocks per watchlist.

## Data storage requirement
Need to store the following data in the databse for this app
1. user details 
2. Saved valuations in watchlist by the user
3. Some global statistics related to risk premium, country soverein rating, industry statistics - It can be used for valuation, There are currently 5 data tables for FCFF. If there is a change in the value of the field in any of this table, any user used to evaluate using that value should get a notification regarding the update and the effect of it in their valuation.

## Home screen 
Home screen will be the watchlist screen, with side scrolling enabled to scroll to different watchlist. and at the top a search bar for searching stock within the watchlisst. and a settings icon in the right side of the same bar rename the watchlist name or to sort the items in the watchlist. 

For each item in a watchlist, following details will be visible
1. Status dot (red for Expired, orange for any change in the global statistics as mentioned in the Data storage requirement, green for others) with Stock name ticker in bracket (left of the card)
2. Description be the user (left side below Stock name)
3. Valuation result as a numerical value (right side of the card)
4. Current stock price (right side below valuation result)) with % difference from the valuation result. - this has to be fetch from internet using the stock ticker
when the user click on the watchlist card bottum popup will appear with more details, which are-
5. Method of valuation - for example FCFF
6. Date of valuation
7. Expiry date
8. Country & Industry.
9. An edit button in the top right of the card to edit / to duplicate the card also to delete the card

At the bottom right of the screen there shall be a flating round button to add new stock valuation (for free users, it will appear only if they have no saved valuation). When  it clicked, it will expand to different valuation to select from (for strating only FCFF will be available). When FCFF is selected it will goes to FCFF valuation

## FCFF valuation
It will have 5 steps involved in the calculation, thus 5 screens. There has to be a status bar in the top or bottom to show the completion status of overall evaluation.
1. General Info
2. Financials
3. Cost of capital
4. Forecasting
5. Valuation

The fields present in each screen is listed below along with the type
A. input from user
B. calculated field or autopopulated field
C. calculated field but user can override the value

### General Info
1. Company Name - A
2. Description - A
3. Ticker - B
4. Last Modified on -B
5. Country - B
6. Currency - B
7. Show values in - A
8. 10Y Treasury yield - C
9. Country spread - C
10. Risk free rate - C
11. Marginal tax rate -C
12. Expected inflation rate - A
13. Industry - C

### FInancial Details
1. Revenue - A (need two input fields-for last 12 months and for last financial year)
2. EBIT - A (two input field like Revenue)
3. Interest Expense -A (two input field like Revenue)
4. Book value of equity - A (two input field like Revenue)
5. Book value of debt - A (two input field like Revenue)
6. Average debt maturity -A
7. No of shares outstanding -A
8. Do the company has Convertible debt(yes/No) - A
9. Details of convertible debt (if the company has convertible debt)
     9.1. Book value of debt - A
     9.2. Interest on convertible debt -A
     9.3. Market value of convertible debt -A
     9.4. Present value of convertible debt - B
10. Minority interest - A (two input field like Revenue)
11. Cross holdings and other non-operating assets - A (two input field like Revenue)
12. Cash and Marketable Securities - A (two input field like Revenue)
13. Remaining Quarted for next annual report - A
14. Do the company has cash trapped in forein country(yes/No) - A
15. Details of cash trapped (if company has cash trapped in forein country)
      15.1. Amount trapped in forein country -A
      15.2. Forien tax rate -A
      15.3. Trapped cash value -B
16. Do you want to capitalize R&D (Yes/No) -A
17. Details of R&D expenses (if R&D needs to capitalize)
      17.1. R&D Expense table (columns: year, R&D expenses)- A (Last 5 years)
      17.2. Amortisation year for {Industry} - C
      17.3. EBIT adj to R&D - B
      17.4. Un anortised portion- B
18.  Do you want to capitalize Lease (Yes/No) -A
19.  Details of Lease expenses (if lease needs to capitalize)
      19.1. Lease Expense table (columns:year, lease expense) - A (Last 5 years)
      19.2. EBIT adjusted to Lease - B
      19.3. Interest Adjusted to lease - B
      19.4. Debt Adjusted to lease (PV) - B
20. Company rating (Moody/S&P Rating) - A
21. Company type (if rating is not available) (Large or safe/ Small or risky) -A 
22. Pre Tax cost of debt - C
23. EBIT TTM (Adjusted) - B
24. Cash TTM -B
25. Book value of Debt -B
26. Market value of debt - B
27. Cost of debt - C

## Cost of Capital 
1. Is the company has multi industry or region revenue (Yes/No) - A
2. Revenue table (columns: industry,Market, Revenue)(If the above is true) -A
3. Method of calculation of cost of capital (Detailed method/Industry or market Average) -A
4. Detailed method 
  4.1. Unlevered beta -B
  4.2. Levered beta -B
  4.3. Equity Risk Premium -C
  4.4. Mature market ERP - B
  4.5. Cost of equity -B
  4.6. Preferred Shares Price -A
  4.7. Preferred Shares number - A
  4.8. Preferred Shares divident -A
  4.9. Current share price - B
  4.10. Market value of equity - B
  4.11. Cost of Capital -B
5. Industry or market Average method
  5.1. Resk grouping (10th, 25th, Median, 75th, 90th) - A
 
## Forecasting

1. Revenue growth -A (need three input fields- Next year, during the year 2-5, during the year 6-10)
2. Industry avg 2 year revenue growth -B (two fields - Global and current Market)
3. Industry avg 5 year revenue growth -B (two fields - Global and current Market)
4. Graph showing next 10year forecasted revenue growth
5. Graph showing next 10year forecasted revenue.
6. Operating margin - A (need two input fields- Next year and target operating margin)
7. Year of convergence -A
8. Graph showing next 10year forecasted operating margin with current operating margin and industry average emarked in the graph.
9. Graph showing next 10year forecasted EBIT
10. Effective Tax rate - A
11. Can we assume after 10 years effective tax to be marginal tax (Yes/No) - A
12. Losses carried forward - A
13. Graph showing next 10year forecasted EBI
14. Risk free rate at the terminal year - A
15. Can we assume after 10 years  Cost of capital as per mature market (Yes/No) - A
16. Mature market ERP - B
17. Cost of capital in terminal year - B
18. Graph showing next 10year forecasted cost of capital with industry average cost of capital marked in the graph
19. Sales to capital ratio - A (need two input fields- for 1-5 years and 6-10 year)
20. Industry Sales to capital ratio - B (two fields - Global and current Market)
21. Reinvestment lag - A
22. Can we assume after 10 years  ROIC as Cost of capital (Yes/No) - A
23. Terminal ROIC - C
24. Graph showing next 10year forecasted ROIC with industry average ROIC marked in the graph
25. Graph showing next 10year forecasted Free cashflow
26. Present value of cashflow & Terminal value - B

## Valuation
1. Equity value - B
2. Estimated value per share - B
3. Current share value - B
4. Premium - B









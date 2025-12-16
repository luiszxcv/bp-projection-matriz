Lógica de Expansão WTP (como na planilha)
Visão geral
Cada safra nasce no mês de go-live com:
SOW (Share of Wallet) da safra = #GoLives_mês × AnnualWTP.
ShareOfWalletActived da safra (mês 0) = Revenue Live desse go-live.
No mês de nascimento, não há expansão; somente registra SOW e receita de go-live.
A expansão começa a partir do mês seguinte (idade 1 da safra) e segue a agenda de % Share of Wallet Desired fixa por tier.
Agenda de % Share of Wallet Desired (por tier e por mês da safra)
Usar sempre os percentuais fixos abaixo (não calcular dinamicamente). Índice 0 = idade 0 (mês do go-live); idade 1 usa o valor na 2ª coluna, e assim por diante.
Enterprise: 2%, 0%, 0%, 10%, 0%, 0%, 30%, 0%, 0%, 30%, 0%, 0%, 30%
Large: 4%, 0%, 0%, 10%, 0%, 0%, 30%, 0%, 0%, 30%, 0%, 0%, 30%
Medium: (Jan) 11%, 0%, 32%, 17%, 15%, 10%, 10%, 7%, 5%, 4%, 0%, 0%, 0%
Medium: (Fev/Mar) 6%, 0%, 32%, 17%, 15%, 10%, 10%, 7%, 5%, 4%, 0%, 0%
Small: 30%, 0%, 32%, 17%, 15%, 10%, 10%, 7%, 5%, 4%, 0%, 0%, 0% (total 100%)
Tiny: 40%, 0%, 32%, 17%, 15%, 10%, 10%, 7%, 5%, 4%, 0%, 0%
Observação: “Dinâmico” na planilha é apenas a célula que calcula o % para mostrar referência; a execução usa os percentuais fixos acima.
Cálculo mensal por safra (idade t ≥ 1)
1) totalSOW = constante da safra (goLives origem × AnnualWTP).
2) %desired_t = valor fixo da agenda para a idade t (ex.: idade 2 usa o terceiro valor da lista).
3) ShareOfWalletDesired_t = totalSOW × %desired_t.
4) ExpansionGoal_t = max(0, ShareOfWalletDesired_t – ShareOfWalletActived_{t-1}), limitado pelo bolso restante remaining = totalSOW – ShareOfWalletActived_{t-1}.
5) #Expansions_t = ceil(ExpansionGoal_t / ticket_médio_expansão), onde ticket_médio_expansão é a média ponderada pelos tickets de expansão e mix por produto do tier.
6) Receita por produto no mês t: clientes_produto × ticket_expansão_produto conforme o mix do tier.
7) RevenueExpansion_t = soma das receitas por produto.
8) ShareOfWalletActived_t = ShareOfWalletActived_{t-1} + RevenueExpansion_t (para exibir/guardar na safra).
9) Atualizar SOW Remaining, Saturation e Monetization Potential com base nessa safra se precisar exibir por safra.
Mix e tickets de expansão (por tier)
Enterprise: mix 50/40/5/5/0 (% saber/ter/executar-noLoyalty/executar-loyalty/potencializar); tickets: 70k / 10k / 10k / 100k / 0
Large: mix 40/40/10/10/0; tickets: 25k / 10k / 8k / 72k / 0
Medium: mix 25/35/20/20/0; tickets: 20k / 10k / 6k / 42k / 0
Small: mix 60/40/0/0/0; tickets: 8k / 10k / 0 / 0 / 0
Tiny: mix 60/40/0/0/0; tickets: 8k / 6k / 0 / 0 / 0
(ticket_médio_expansão = soma(mix × ticket_expansão_produto) do tier.)
Exemplo (Enterprise, safra nascida em Jan, olhando Março – idade 2)
totalSOW = 140.000.000
Agenda %desired: 2%, 0%, 0%, 10%, ...
idade 1 (Fev): 0% → goal 0 → expansions 0
idade 2 (Mar): %desired = 0% (terceiro valor) → goal 0 → expansions 0
idade 3 (Abr): %desired = 10% (quarto valor) → ShareOfWalletDesired = 14.000.000; goal = 14.000.000 – 1.455.264 = 12.544.736, limitado pelo remaining; expansions = ceil(goal / ticket_médio_expansão).
Observação sobre exibição
Para conferir por safra (como na planilha), não somar safras diferentes. Cada safra deve manter seus próprios campos (SOW, actived, goal, revenue expansion).
A linha de “totais por tier” é a soma das safras, mas a conferência célula a célula é por safra.



## Total mês a mês de expansão WTP:
R$ 0	R$ 3.682.000	R$ 5.958.000	R$ 7.715.000	R$ 10.624.000	R$ 14.299.000	R$ 16.115.000	R$ 20.316.000	R$ 24.962.000	R$ 26.901.000	R$ 28.620.000	R$ 31.768.000	
Total: R$ 190.960.000

## Expansão por tier por produto em fev (exemplo):
			Expansion				R$ 0,00	R$ 3.572.000,00	R$ 2.329.000,00	R$ 1.682.000,00	R$ 1.120.000,00	R$ 2.295.000,00	R$ 780.000,00	R$ 578.000,00	R$ 1.728.000,00	R$ 0,00	R$ 0,00	R$ 14.084.000
																		
				Enterprise			R$ 0,00	R$ 0,00	R$ 160.000,00	R$ 0,00	R$ 0,00	R$ 400.000,00	R$ 0,00	R$ 0,00	R$ 400.000,00	R$ 0,00	R$ 0,00	
					[Saber]		R$ 0,00	R$ 0,00	R$ 140.000,00	R$ 0,00	R$ 0,00	R$ 350.000,00	R$ 0,00	R$ 0,00	R$ 350.000,00	R$ 0,00	R$ 0,00	
					[Ter]		R$ 0,00	R$ 0,00	R$ 20.000,00	R$ 0,00	R$ 0,00	R$ 50.000,00	R$ 0,00	R$ 0,00	R$ 50.000,00	R$ 0,00	R$ 0,00	
					[Executar-no loyalty]		R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	
					[Executar-loyalty]		R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	
					[Potencializar]		R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	
																		
				Large			R$ 0,00	R$ 0,00	R$ 271.000,00	R$ 0,00	R$ 0,00	R$ 789.000,00	R$ 0,00	R$ 0,00	R$ 880.000,00	R$ 0,00	R$ 0,00	
					[Saber]		R$ 0,00	R$ 0,00	R$ 125.000,00	R$ 0,00	R$ 0,00	R$ 375.000,00	R$ 0,00	R$ 0,00	R$ 400.000,00	R$ 0,00	R$ 0,00	
					[Ter]		R$ 0,00	R$ 0,00	R$ 50.000,00	R$ 0,00	R$ 0,00	R$ 150.000,00	R$ 0,00	R$ 0,00	R$ 160.000,00	R$ 0,00	R$ 0,00	
					[Executar-no loyalty]		R$ 0,00	R$ 0,00	R$ 24.000,00	R$ 0,00	R$ 0,00	R$ 48.000,00	R$ 0,00	R$ 0,00	R$ 32.000,00	R$ 0,00	R$ 0,00	
					[Executar-loyalty]		R$ 0,00	R$ 0,00	R$ 72.000,00	R$ 0,00	R$ 0,00	R$ 216.000,00	R$ 0,00	R$ 0,00	R$ 288.000,00	R$ 0,00	R$ 0,00	
					[Potencializar]		R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	R$ 0,00	
																		
				Medium			R$ 0,00	R$ 1.744.000,00	R$ 926.000,00	R$ 818.000,00	R$ 540.000,00	R$ 540.000,00	R$ 374.000,00	R$ 280.000,00	R$ 208.000,00	R$ 0,00	R$ 0,00	
					[Saber]		R$ 0	R$ 480.000	R$ 260.000	R$ 220.000	R$ 140.000	R$ 140.000	R$ 100.000	R$ 80.000	R$ 60.000	R$ 0	R$ 0	
					[Ter]		R$ 0	R$ 340.000	R$ 180.000	R$ 160.000	R$ 100.000	R$ 100.000	R$ 70.000	R$ 50.000	R$ 40.000	R$ 0	R$ 0	
					[Executar-no loyalty]		R$ 0	R$ 126.000	R$ 66.000	R$ 60.000	R$ 48.000	R$ 48.000	R$ 36.000	R$ 24.000	R$ 24.000	R$ 0	R$ 0	
					[Executar-loyalty]		R$ 0	R$ 798.000	R$ 420.000	R$ 378.000	R$ 252.000	R$ 252.000	R$ 168.000	R$ 126.000	R$ 84.000	R$ 0	R$ 0	
					[Potencializar]		R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	
																		
				Small			R$ 0,00	R$ 1.354.000,00	R$ 720.000,00	R$ 642.000,00	R$ 430.000,00	R$ 422.000,00	R$ 298.000,00	R$ 220.000,00	R$ 176.000,00	R$ 0,00	R$ 0,00	
					[Saber]		R$ 0	R$ 744.000	R$ 400.000	R$ 352.000	R$ 240.000	R$ 232.000	R$ 168.000	R$ 120.000	R$ 96.000	R$ 0	R$ 0	
					[Ter]		R$ 0	R$ 610.000	R$ 320.000	R$ 290.000	R$ 190.000	R$ 190.000	R$ 130.000	R$ 100.000	R$ 80.000	R$ 0	R$ 0	
					[Executar-no loyalty]		R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	
					[Executar-loyalty]		R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	
					[Potencializar]		R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	
																		
				Tiny			R$ 0,00	R$ 474.000,00	R$ 252.000,00	R$ 222.000,00	R$ 150.000,00	R$ 144.000,00	R$ 108.000,00	R$ 78.000,00	R$ 64.000,00	R$ 0,00	R$ 0,00	
					[Saber]		R$ 0	R$ 312.000	R$ 168.000	R$ 144.000	R$ 96.000	R$ 96.000	R$ 72.000	R$ 48.000	R$ 40.000	R$ 0	R$ 0	
					[Ter]		R$ 0	R$ 162.000	R$ 84.000	R$ 78.000	R$ 54.000	R$ 48.000	R$ 36.000	R$ 30.000	R$ 24.000	R$ 0	R$ 0	
					[Executar-no loyalty]		R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	
					[Executar-loyalty]		R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	
					[Potencializar]		R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	R$ 0	

---



## Jan de oboarding até expansion (WTP):
Onboarding						
	VM6	# Customers Activated				  965 
	CR6	# Customers Activated → Live				100%
		# Customers Go Live				965
						
	VM6	$ Revenue Activated				R$ 20.306.364
	CR6	$ Revenue Activated → Live				100%
		$ Revenue Live				R$ 20.306.364
						  -   
		Enterprise				
			% Enterprise Go Lives			100%
			# Enterprise Go Lives			28
			% Enterprise Revenue Live			100%
			$ Enterprise Revenue Live			R$ 1.455.264
				% Enterprise [Saber]		100%
				% Enterprise Revenue [Saber]		100%
				% Enterprise [Ter]		100%
				% Enterprise Revenue [Ter] 		100%
				% Enterprise [Executar-no loyalty]		100%
				% Enterprise Revenue [Executar-no loyalty]		100%
				% Enterprise [Executar-loyalty]		100%
				% Enterprise Revenue [Executar-loyalty]		100%
				% Enterprise [Potencializar]		100%
				% Enterprise Revenue [Potencializar]		100%
				# Enterprise Go Lives [Saber]		19
				$ Enterprise Revenue Live [Saber]		R$ 558.000,00
				# Enterprise Go Lives [Ter]		3
				$ Enterprise Revenue Live [Ter]		88.164
				# Enterprise Go Lives [Executar-no loyalty]		0
				$ Enterprise Revenue Live [Executar-no loyalty]		0
				# Enterprise Go Lives [Executar-loyalty]		6
				$ Enterprise Revenue Live [Executar-loyalty]		809.100
				# Enterprise Go Lives [Potencializar]		3
				$ Enterprise Revenue Live [Potencializar]		0
						
		Large				
			% Large Go Lives			100%
			# Large Go Lives			38
			% Large Revenue Live			100%
			$ Large Revenue Live			R$ 1.540.080
				% Large [Saber]		100%
				% Large Revenue [Saber]		100%
				% Large [Ter]		100%
				% Large Revenue [Ter] 		100%
				% Large [Executar-no loyalty]		100%
				% Large Revenue [Executar-no loyalty]		100%
				% Large [Executar-loyalty]		100%
				% Large Revenue [Executar-loyalty]		100%
				% Large [Potencializar]		100%
				% Large Revenue [Potencializar]		100%
				# Large Go Lives [Saber]		25
				$ Large Revenue Live [Saber]		627.750
				# Large Go Lives [Ter]		5
				$ Large Revenue Live [Ter]		83.700
				# Large Go Lives [Executar-no loyalty]		0
				$ Large Revenue Live [Executar-no loyalty]		0
				# Large Go Lives [Executar-loyalty]		8
				$ Large Revenue Live [Executar-loyalty]		828.630
				# Large Go Lives [Potencializar]		4
				$ Large Revenue Live [Potencializar]		0
						
		Medium				
			% Medium Go Lives			100%
			# Medium Go Lives			201
			% Medium Revenue Live			100%
			$ Medium Revenue Live			R$ 5.636.730
				% Medium [Saber]		100%
				% Medium Revenue [Saber]		100%
				% Medium [Ter]		100%
				% Medium Revenue [Ter] 		100%
				% Medium [Executar-no loyalty]		100%
				% Medium Revenue [Executar-no loyalty]		100%
				% Medium [Executar-loyalty]		100%
				% Medium Revenue [Executar-loyalty]		100%
				% Medium [Potencializar]		100%
				% Medium Revenue [Potencializar]		100%
				# Medium Go Lives [Saber]		120
				$ Medium Revenue Live [Saber]		2.399.400
				# Medium Go Lives [Ter]		21
				$ Medium Revenue Live [Ter]		320.850
				# Medium Go Lives [Executar-no loyalty]		0
				$ Medium Revenue Live [Executar no- loyalty]		0
				# Medium Go Lives [Executar-loyalty]		60
				$ Medium Revenue Live [Executar-loyalty]		2.916.480
				# Medium Go Lives [Potencializar]		0
				$ Medium Revenue Live [Potencializar]		0
						
		Small				
			% Small Go Lives			100%
			# Small Go Lives			474
			% Small Revenue Live			100%
			$ Small Revenue Live			R$ 8.661.090
				% Small [Saber]		100%
				% Small Revenue [Saber]		100%
				% Small [Ter]		100%
				% Small Revenue [Ter] 		100%
				% Small [Executar-no loyalty]		0%
				% Small Revenue [Executar-no loyalty]		0%
				% Small [Executar-loyalty]		0%
				% Small Revenue [Executar-loyalty]		0%
				% Small [Potencializar]		0%
				% Small Revenue [Potencializar]		0%
				# Small Go Lives [Saber]		379
				$ Small Revenue Live [Saber]		7.570.200
				# Small Go Lives [Ter]		95
				$ Small Revenue Live [Ter]		1.090.890
				# Small Go Lives [Executar-no loyalty]		0
				$ Small Revenue Live [Executar-no loyalty]		0
				# Small Go Lives [Executar-loyalty]		0
				$ Small Revenue Live [Executar-loyalty]		0
				# Small Go Lives [Potencializar]		0
				$ Small Revenue Live [Potencializar]		0
						
		Tiny				
			% Tiny Go Lives			100%
			# Tiny Go Lives			224
			% Tiny Revenue Live			100%
			$ Tiny Revenue Live			R$ 3.013.200
				% Tiny [Saber]		100%
				% Tiny Revenue [Saber]		100%
				% Tiny [Ter]		100%
				% Tiny Revenue [Ter] 		100%
				% Tiny [Executar-no loyalty]		0%
				% Tiny Revenue [Executar-no loyalty]		0%
				% Tiny [Executar-loyalty]		0%
				% Tiny Revenue [Executar-loyalty]		0%
				% Tiny [Potencializar]		0%
				% Tiny Revenue [Potencializar]		0%
				# Tiny Go Lives [Saber]		179
				$ Tiny Revenue Live [Saber]		2.678.400
				# Tiny Go Lives [Ter]		45
				$ Tiny Revenue Live [Ter]		334.800
				# Tiny Go Lives [Executar-no loyalty]		0
				$ Tiny Revenue Live [Executar-no loyalty]		0
				# Tiny Go Lives [Executar-loyalty]		0
				$ Tiny Revenue Live [Executar-loyalty]		0
				# Tiny Go Lives [Potencializar]		0
				$ Tiny Revenue Live [Potencializar]		0
						
						
Renewall						
						
	VM6	$ [Executar] Revenue Live				R$ 4.554.210,00
	VM8	$ [Executar] Expansion Revenue Won				R$ 0
						
	CR7	% Revenue Renewal				
	VM7	$ Revenue Renewal				R$ 0,00
						
		Enterprise				
			$ Enterprise Renewal [Executar-no loyalty]			
				$ [Executar-no loyalty] Revenue Expansion		R$ 0
				$ Revenue Live [Executar-no loyalty]		R$ 0,00
				$ Revenue [Executar-no loyalty]		R$ 0,00
				# Life-time		2
						2
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						
				$ Revenue Renewal [Executar-no loyalty]		80%
				% Revenue Renewal [Executar-no loyalty]		R$ 0,00
				$ All Revenue [Executar-no loyalty]		R$ 0,00
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						
			$ Enterprise Renewal [Executar-loyalty]			
				$ [Executar-loyalty] Revenue Expansion		R$ 0
				$ Revenue Live [Executar-loyalty]		R$ 809.100,00
				$ Revenue [Executar-loyalty]		R$ 809.100,00
				# Life-time		10
						10
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						
				% Revenue Renewal [Executar-loyalty]		20%
				$ Revenue Renewal [Executar-loyalty]		R$ 0,00
				$ All Revenue [Executar-loyalty]		R$ 809.100,00
						809.100
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						
			$ Enterprise Renewal [Potencializar]			
				# Enterprise Go Lives [Potencializar]		3
				$ Avg. Monthly Ticket [Potencializar]		R$ 4.500,00
				% Avg. Ticket Increase [Potencializar]		110%
				$ Revenue Renewal [Potencializar]		R$ 0,00
						
		Large				
			$ Large Renewal [Executar-no loyalty]			
				$ [Executar-no loyalty] Revenue Expansion		R$ 0,00
				$ Revenue Live [Executar-no loyalty]		R$ 0,00
				$ Revenue [Executar-no loyalty]		R$ 0,00
				# Life-time		2
						2
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						
				$ Revenue Renewal [Executar-no loyalty]		80%
				% Revenue Renewal [Executar-no loyalty]		R$ 0,00
				$ All Revenue [Executar-no loyalty]		R$ 0,00
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						
			$ Large Renewal [Executar-loyalty]			
				$ [Executar-loyalty] Revenue Expansion		R$ 0,00
				$ Revenue Live [Executar-loyalty]		R$ 828.630,00
				$ Revenue [Executar loyalty]		R$ 828.630,00
				# Life-time		9
						9
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
				$ Revenue Renewal [Executar-loyalty]		20%
				% Revenue Renewal [Executar-loyalty]		R$ 0,00
				$ All Revenue [Executar-loyalty]		R$ 828.630,00
						828.630
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						
			$ Large Renewal [Potencializar]			R$ 0,00
				# Large Go Lives [Potencializar]		4
				$ Avg. Monthly Ticket [Potencializar]		R$ 4.500,00
				% Avg. Ticket Increase [Potencializar]		110%
				$ Revenue Renewal [Potencializar]		R$ 0,00
						
		Medium				
			$ Medium Renewal [Executar-no loyalty]			
				$ [Executar-no loyalty] Revenue Expansion		R$ 0
				$ Revenue Live [Executar-no loyalty]		R$ 0,00
				$ Revenue [Executar-no loyalty]		R$ 0,00
				# Life-time		2
						2
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						
				% Revenue Renewal [Executar-no loyalty]		80%
				$ Revenue Renewal [Executar-no loyalty]		R$ 0,00
				$ All Revenue [Executar-no loyalty]		R$ 0,00
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						
			$ Medium Renewal [Executar-loyalty]			R$ 0,00
				$ [Executar-loyalty] Revenue Expansion		R$ 0
				$ Revenue Live [Executar-loyalty]		R$ 2.916.480,00
				$ Revenue [Executar-loyalty]		R$ 2.916.480,00
				# Life-time		7
						7
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						
				% Revenue Renewal [Executar-loyalty]		20%
				$ Revenue Renewal [Executar-loyalty]		R$ 0,00
				$ All Revenue [Executar-loyalty]		R$ 2.916.480,00
						2.916.480
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						
			$ Medium Renewal [Potencializar]			R$ 0,00
				# Medium Go Lives [Potencializar]		0
				$ Avg. Monthly Ticket [Potencializar]		R$ 0,00
				% Avg. Ticket Increase [Potencializar]		0%
				$ Revenue Renewal [Potencializar]		R$ 0,00
						
						
Expansion						
						
	VM8	$ Expansion Revenue Won				R$ 0,00
						
	CR8	% Revenue Cross-sell [Saber]				0,00%
	VM8	$ Revenue Cross-sell [Saber]				R$ 0,00
						
	CR8	% Revenue Cross-sell [Ter]				0,00%
	VM8	$ Revenue Cross-sell [Ter]				R$ 0,00
						
	CR8	% Revenue Upsell [Executar-no loyalty]				0,00%
	VM8	$ Revenue Upsell [Executar-no loyalty]				R$ 0,00
						
	CR8	% Revenue Upsell [Executar-loyalty]				0,00%
	VM8	$ Revenue Upsell [Executar-loyalty]				R$ 0,00
						
	CR8	% Revenue Upsell [Potencializar]				0,00%
	VM8	$ Revenue Upsell [Potencializar]				R$ 0,00
						
		Enterprise				
			# Enterprise Go Lives			28
			$ Enterprise Revenue Live		1,04%	R$ 1.455.264
			$ Annual WTP			R$ 5.000.000
			$ Total Share of Wallet			R$ 140.000.000
						
			% Share of Wallet Desired		2%	0,00%
			$ Share of Wallet Desired		R$ 2.910.528	
			$ Share of Wallet Actived			R$ 1.455.264
			$ Expansion Goal		R$ 1.455.264	R$ 0
						
			$ Share of Wallet Remaining			R$ 138.544.736
			% Index Saturation Base			1,45%
			% Index Monetization Potential			98,96%
						
			# Expansions			0
			$ Enterprise Average Ticket			R$ 44.500
			$ Revenue Expansion			R$ 0,00
				% [Saber]		50,00%
				% [Ter]		40,00%
				% [Executar-no loyalty]		5,00%
				% [Executar-loyalty]		5,00%
				% [Potencializar]		0,00%
				$ [Saber] Average Ticket 		R$ 70.000,00
				$ [Ter]  Average Ticket 		R$ 10.000,00
				$ [Executar-no loyalty] Average Ticket 		R$ 10.000,00
				$ [Executar-loyalty] Average Ticket 		R$ 100.000,00
				$ [Potencializar] Average Ticket 		R$ 0,00
				# Lowest Ticket Index		2
						
				# [Saber]		0
				$ [Saber] Revenue Expansion		R$ 0
						
				# [Ter]		0
				$ [Ter] Revenue Expansion		R$ 0
						
				# [Executar-no loyalty]		0
				$ [Executar-no loyalty] Revenue Expansion		R$ 0
						
				# [Executar-loyalty]		0
				$ [Executar-loyalty] Revenue Expansion		R$ 0
						
				# [Potencializar]		0
				$ [Potencializar] Revenue Expansion		R$ 0
						
		Large				
			# Large Go Lives			38
			$ Large Revenue Live		1,35%	R$ 1.540.080
			$ Annual WTP			R$ 3.000.000
			$ Total Share of Wallet			R$ 114.000.000
						
			% Share of Wallet Desired		4%	0%
			$ Share of Wallet Desired		R$ 4.620.240	
			$ Share of Wallet Actived			R$ 1.540.080
			$ Expansion Goal		R$ 3.080.160	R$ 0
						
			$ Share of Wallet Remaining			R$ 112.459.920
			% Index Saturation Base			1,35%
			% Index Monetization Potential			98,65%
						
			# Expansions			0
			$ Large Average Ticket			R$ 22.000
			$ Revenue Expansion			R$ 0,00
				% [Saber]		40,00%
				% [Ter]		40,00%
				% [Executar-no loyalty]		10,00%
				% [Executar-loyalty]		10,00%
				% [Potencializar]		0,00%
				$ [Saber] Average Ticket 		R$ 25.000,00
				$ [Ter]  Average Ticket 		R$ 10.000,00
				$ [Executar-no loyalty] Average Ticket 		R$ 8.000,00
				$ [Executar-loyalty] Average Ticket 		R$ 72.000,00
				$ [Potencializar] Average Ticket 		R$ 0,00
				# Lowest Ticket Index		3
						
				# [Saber]		0
				$ [Saber] Revenue Expansion		R$ 0
						
				# [Ter]		0
				$ [Ter] Revenue Expansion		R$ 0
						
				# [Executar-no loyalty]		0
				$ [Executar-no loyalty] Revenue Expansion		R$ 0
						
				# [Executar-loyalty]		0
				$ [Executar-loyalty] Revenue Expansion		R$ 0
						
				# [Potencializar]		0
				$ [Potencializar] Revenue Expansion		R$ 0
						
		Medium				
			# Medium Go Lives			201
			$ Medium Revenue Live		5,61%	R$ 5.636.730
			$ Annual WTP			R$ 500.000
			$ Total Share of Wallet			R$ 100.500.000
						
			% Share of Wallet Desired		11%	0,00%
			$ Share of Wallet Desired		R$ 11.273.460	
			$ Share of Wallet Actived			R$ 5.636.730
			$ Expansion Goal		R$ 5.636.730	R$ 0
						
			$ Share of Wallet Remaining			R$ 94.863.270
			% Index Saturation Base			5,61%
			% Index Monetization Potential			94,39%
						
			# Expansions			0
			$ Medium Average Ticket			R$ 18.100
			$ Revenue Expansion			R$ 0,00
				% [Saber]		25,00%
				% [Ter]		35,00%
				% [Executar-no loyalty]		20,00%
				% [Executar-loyalty]		20,00%
				% [Potencializar]		0,00%
				$ [Saber] Average Ticket 		R$ 20.000,00
				$ [Ter]  Average Ticket 		R$ 10.000,00
				$ [Executar-no loyalty] Average Ticket 		R$ 6.000,00
				$ [Executar-loyalty] Average Ticket 		R$ 42.000,00
				$ [Potencializar] Average Ticket 		R$ 0,00
				# Lowest Ticket Index		3
						
				# [Saber]		0
				$ [Saber] Revenue Expansion		R$ 0
						
				# [Ter]		0
				$ [Ter] Revenue Expansion		R$ 0
						
				# [Executar-no loyalty]		0
				$ [Executar-no loyalty] Revenue Expansion		R$ 0
						
				# [Executar-loyalty]		0
				$ [Executar-loyalty] Revenue Expansion		R$ 0
						
				# [Potencializar]		0
				$ [Potencializar] Revenue Expansion		R$ 0
						
						
		Small				
			# Small Go Lives			474
			$ Small Revenue Live		20,30%	R$ 8.661.090
			$ Annual WTP			R$ 90.000
			$ Total Share of Wallet			R$ 42.660.000
						
			% Share of Wallet Desired		30%	0,00%
			$ Share of Wallet Desired		R$ 12.991.635	
			$ Share of Wallet Actived			R$ 8.661.090
			$ Expansion Goal		R$ 4.330.545	R$ 0
						
			$ Share of Wallet Remaining			R$ 33.998.910
			% Index Saturation Base			20,30%
			% Index Monetization Potential			79,70%
						
			# Expansions			0
			$ Small Average Ticket			R$ 8.800
			$ Revenue Expansion			R$ 0,00
				% [Saber]		60,00%
				% [Ter]		40,00%
				% [Executar-no loyalty]		0,00%
				% [Executar-loyalty]		0,00%
				% [Potencializar]		0,00%
				$ [Saber] Average Ticket 		R$ 8.000,00
				$ [Ter]  Average Ticket 		R$ 10.000,00
				$ [Executar-no loyalty] Average Ticket 		R$ 0,00
				$ [Executar-loyalty] Average Ticket 		R$ 0,00
				$ [Potencializar] Average Ticket 		R$ 0,00
				# Lowest Ticket Index		1
						
				# [Saber]		0
				$ [Saber] Revenue Expansion		R$ 0
						
				# [Ter]		0
				$ [Ter] Revenue Expansion		R$ 0
						
				# [Executar-no loyalty]		0
				$ [Executar-no loyalty] Revenue Expansion		R$ 0
						
				# [Executar-loyalty]		0
				$ [Executar-loyalty] Revenue Expansion		R$ 0
						
				# [Potencializar]		0
				$ [Potencializar] Revenue Expansion		R$ 0
						
		Tiny				
			# Tiny Go Lives			224
			$ Tiny Revenue Live		26,90%	R$ 3.013.200
			$ Annual WTP			R$ 50.000
			$ Total Share of Wallet			R$ 11.200.000
						
			% Share of Wallet Desired		40%	0%
			$ Share of Wallet Desired		R$ 4.519.800	
			$ Share of Wallet Actived			R$ 3.013.200
			$ Expansion Goal		R$ 1.506.600	R$ 0
						
			$ Share of Wallet Remaining			R$ 8.186.800
			% Index Saturation Base			26,90%
			% Index Monetization Potential			73,10%
						
			# Expansions			0
			$ Tiny Average Ticket			R$ 7.200
			$ Revenue Expansion			R$ 0,00
				% [Saber]		60,00%
				% [Ter]		40,00%
				% [Executar-no loyalty]		0,00%
				% [Executar-loyalty]		0,00%
				% [Potencializar]		0,00%
				$ [Saber] Average Ticket 		R$ 8.000,00
				$ [Ter]  Average Ticket 		R$ 6.000,00
				$ [Executar-no loyalty] Average Ticket 		R$ 0,00
				$ [Executar-loyalty] Average Ticket 		R$ 0,00
				$ [Potencializar] Average Ticket 		R$ 0,00
				# Lowest Ticket Index		2
						
				# [Saber]		0
				$ [Saber] Revenue Expansion		R$ 0
						
				# [Ter]		0
				$ [Ter] Revenue Expansion		R$ 0
						
				# [Executar-no loyalty]		0
				$ [Executar-no loyalty] Revenue Expansion		R$ 0
						
				# [Executar-loyalty]		0
				$ [Executar-loyalty] Revenue Expansion		R$ 0
						
				# [Potencializar]		0
				$ [Potencializar] Revenue Expansion		R$ 0

## Fev de oboarding até expansion (WTP):
Onboarding						
	VM6	# Customers Activated				  941 
	CR6	# Customers Activated → Live				100%
		# Customers Go Live				941
						
	VM6	$ Revenue Activated				R$ 19.808.349
	CR6	$ Revenue Activated → Live				100%
		$ Revenue Live				R$ 19.808.349
						  -   
		Enterprise				
			% Enterprise Go Lives			100%
			# Enterprise Go Lives			28
			% Enterprise Revenue Live			100%
			$ Enterprise Revenue Live			R$ 1.455.264
				% Enterprise [Saber]		100%
				% Enterprise Revenue [Saber]		100%
				% Enterprise [Ter]		100%
				% Enterprise Revenue [Ter] 		100%
				% Enterprise [Executar-no loyalty]		100%
				% Enterprise Revenue [Executar-no loyalty]		100%
				% Enterprise [Executar-loyalty]		100%
				% Enterprise Revenue [Executar-loyalty]		100%
				% Enterprise [Potencializar]		100%
				% Enterprise Revenue [Potencializar]		100%
				# Enterprise Go Lives [Saber]		19
				$ Enterprise Revenue Live [Saber]		R$ 558.000,00
				# Enterprise Go Lives [Ter]		3
				$ Enterprise Revenue Live [Ter]		88.164
				# Enterprise Go Lives [Executar-no loyalty]		0
				$ Enterprise Revenue Live [Executar-no loyalty]		0
				# Enterprise Go Lives [Executar-loyalty]		6
				$ Enterprise Revenue Live [Executar-loyalty]		809.100
				# Enterprise Go Lives [Potencializar]		3
				$ Enterprise Revenue Live [Potencializar]		0
						
		Large				
			% Large Go Lives			100%
			# Large Go Lives			37
			% Large Revenue Live			100%
			$ Large Revenue Live			R$ 1.441.500
				% Large [Saber]		100%
				% Large Revenue [Saber]		100%
				% Large [Ter]		100%
				% Large Revenue [Ter] 		100%
				% Large [Executar-no loyalty]		100%
				% Large Revenue [Executar-no loyalty]		100%
				% Large [Executar-loyalty]		100%
				% Large Revenue [Executar-loyalty]		100%
				% Large [Potencializar]		100%
				% Large Revenue [Potencializar]		100%
				# Large Go Lives [Saber]		24
				$ Large Revenue Live [Saber]		604.500
				# Large Go Lives [Ter]		6
				$ Large Revenue Live [Ter]		100.440
				# Large Go Lives [Executar-no loyalty]		0
				$ Large Revenue Live [Executar-no loyalty]		0
				# Large Go Lives [Executar-loyalty]		7
				$ Large Revenue Live [Executar-loyalty]		736.560
				# Large Go Lives [Potencializar]		4
				$ Large Revenue Live [Potencializar]		0
						
		Medium				
			% Medium Go Lives			100%
			# Medium Go Lives			196
			% Medium Revenue Live			100%
			$ Medium Revenue Live			R$ 5.521.410
				% Medium [Saber]		100%
				% Medium Revenue [Saber]		100%
				% Medium [Ter]		100%
				% Medium Revenue [Ter] 		100%
				% Medium [Executar-no loyalty]		100%
				% Medium Revenue [Executar-no loyalty]		100%
				% Medium [Executar-loyalty]		100%
				% Medium Revenue [Executar-loyalty]		100%
				% Medium [Potencializar]		100%
				% Medium Revenue [Potencializar]		100%
				# Medium Go Lives [Saber]		117
				$ Medium Revenue Live [Saber]		2.343.600
				# Medium Go Lives [Ter]		20
				$ Medium Revenue Live [Ter]		306.900
				# Medium Go Lives [Executar-no loyalty]		0
				$ Medium Revenue Live [Executar no- loyalty]		0
				# Medium Go Lives [Executar-loyalty]		59
				$ Medium Revenue Live [Executar-loyalty]		2.870.910
				# Medium Go Lives [Potencializar]		0
				$ Medium Revenue Live [Potencializar]		0
						
		Small				
			% Small Go Lives			100%
			# Small Go Lives			462
			% Small Revenue Live			100%
			$ Small Revenue Live			R$ 8.453.700
				% Small [Saber]		100%
				% Small Revenue [Saber]		100%
				% Small [Ter]		100%
				% Small Revenue [Ter] 		100%
				% Small [Executar-no loyalty]		0%
				% Small Revenue [Executar-no loyalty]		0%
				% Small [Executar-loyalty]		0%
				% Small Revenue [Executar-loyalty]		0%
				% Small [Potencializar]		0%
				% Small Revenue [Potencializar]		0%
				# Small Go Lives [Saber]		369
				$ Small Revenue Live [Saber]		7.384.200
				# Small Go Lives [Ter]		93
				$ Small Revenue Live [Ter]		1.069.500
				# Small Go Lives [Executar-no loyalty]		0
				$ Small Revenue Live [Executar-no loyalty]		0
				# Small Go Lives [Executar-loyalty]		0
				$ Small Revenue Live [Executar-loyalty]		0
				# Small Go Lives [Potencializar]		0
				$ Small Revenue Live [Potencializar]		0
						
		Tiny				
			% Tiny Go Lives			100%
			# Tiny Go Lives			218
			% Tiny Revenue Live			100%
			$ Tiny Revenue Live			R$ 2.936.475
				% Tiny [Saber]		100%
				% Tiny Revenue [Saber]		100%
				% Tiny [Ter]		100%
				% Tiny Revenue [Ter] 		100%
				% Tiny [Executar-no loyalty]		0%
				% Tiny Revenue [Executar-no loyalty]		0%
				% Tiny [Executar-loyalty]		0%
				% Tiny Revenue [Executar-loyalty]		0%
				% Tiny [Potencializar]		0%
				% Tiny Revenue [Potencializar]		0%
				# Tiny Go Lives [Saber]		174
				$ Tiny Revenue Live [Saber]		2.608.650
				# Tiny Go Lives [Ter]		44
				$ Tiny Revenue Live [Ter]		327.825
				# Tiny Go Lives [Executar-no loyalty]		0
				$ Tiny Revenue Live [Executar-no loyalty]		0
				# Tiny Go Lives [Executar-loyalty]		0
				$ Tiny Revenue Live [Executar-loyalty]		0
				# Tiny Go Lives [Potencializar]		0
				$ Tiny Revenue Live [Potencializar]		0
						
						
Renewall						
						
	VM6	$ [Executar] Revenue Live				R$ 4.416.570,00
	VM8	$ [Executar] Expansion Revenue Won				R$ 0
						
	CR7	% Revenue Renewal				
	VM7	$ Revenue Renewal				R$ 18.000,00
						
		Enterprise				
			$ Enterprise Renewal [Executar-no loyalty]			
				$ [Executar-no loyalty] Revenue Expansion		R$ 0
				$ Revenue Live [Executar-no loyalty]		R$ 0,00
				$ Revenue [Executar-no loyalty]		R$ 0,00
				# Life-time		2
						2
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						
				$ Revenue Renewal [Executar-no loyalty]		80%
				% Revenue Renewal [Executar-no loyalty]		R$ 0,00
				$ All Revenue [Executar-no loyalty]		R$ 0,00
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						
			$ Enterprise Renewal [Executar-loyalty]			
				$ [Executar-loyalty] Revenue Expansion		R$ 0
				$ Revenue Live [Executar-loyalty]		R$ 809.100,00
				$ Revenue [Executar-loyalty]		R$ 809.100,00
				# Life-time		10
						10
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						
				% Revenue Renewal [Executar-loyalty]		20%
				$ Revenue Renewal [Executar-loyalty]		R$ 0,00
				$ All Revenue [Executar-loyalty]		R$ 809.100,00
						809.100
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						
			$ Enterprise Renewal [Potencializar]			
				# Enterprise Go Lives [Potencializar]		3
				$ Avg. Monthly Ticket [Potencializar]		R$ 4.500,00
				% Avg. Ticket Increase [Potencializar]		110%
				$ Revenue Renewal [Potencializar]		R$ 0,00
						
		Large				
			$ Large Renewal [Executar-no loyalty]			
				$ [Executar-no loyalty] Revenue Expansion		R$ 0,00
				$ Revenue Live [Executar-no loyalty]		R$ 0,00
				$ Revenue [Executar-no loyalty]		R$ 0,00
				# Life-time		2
						2
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						
				$ Revenue Renewal [Executar-no loyalty]		80%
				% Revenue Renewal [Executar-no loyalty]		R$ 0,00
				$ All Revenue [Executar-no loyalty]		R$ 0,00
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						
			$ Large Renewal [Executar-loyalty]			
				$ [Executar-loyalty] Revenue Expansion		R$ 0,00
				$ Revenue Live [Executar-loyalty]		R$ 736.560,00
				$ Revenue [Executar loyalty]		R$ 736.560,00
				# Life-time		9
						9
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
				$ Revenue Renewal [Executar-loyalty]		20%
				% Revenue Renewal [Executar-loyalty]		R$ 0,00
				$ All Revenue [Executar-loyalty]		R$ 736.560,00
						736.560
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						
			$ Large Renewal [Potencializar]			R$ 18.000,00
				# Large Go Lives [Potencializar]		4
				$ Avg. Monthly Ticket [Potencializar]		R$ 4.500,00
				% Avg. Ticket Increase [Potencializar]		110%
				$ Revenue Renewal [Potencializar]		R$ 18.000,00
						
		Medium				
			$ Medium Renewal [Executar-no loyalty]			
				$ [Executar-no loyalty] Revenue Expansion		R$ 0
				$ Revenue Live [Executar-no loyalty]		R$ 0,00
				$ Revenue [Executar-no loyalty]		R$ 0,00
				# Life-time		2
						2
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						
				% Revenue Renewal [Executar-no loyalty]		80%
				$ Revenue Renewal [Executar-no loyalty]		R$ 0,00
				$ All Revenue [Executar-no loyalty]		R$ 0,00
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						
			$ Medium Renewal [Executar-loyalty]			R$ 0,00
				$ [Executar-loyalty] Revenue Expansion		R$ 0
				$ Revenue Live [Executar-loyalty]		R$ 2.870.910,00
				$ Revenue [Executar-loyalty]		R$ 2.870.910,00
				# Life-time		7
						7
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						
				% Revenue Renewal [Executar-loyalty]		20%
				$ Revenue Renewal [Executar-loyalty]		R$ 0,00
				$ All Revenue [Executar-loyalty]		R$ 2.870.910,00
						2.870.910
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						0
						
			$ Medium Renewal [Potencializar]			R$ 0,00
				# Medium Go Lives [Potencializar]		0
				$ Avg. Monthly Ticket [Potencializar]		R$ 0,00
				% Avg. Ticket Increase [Potencializar]		0%
				$ Revenue Renewal [Potencializar]		R$ 0,00
						
						
Expansion						
						
	VM8	$ Expansion Revenue Won				R$ 0,00
						
	CR8	% Revenue Cross-sell [Saber]				0,00%
	VM8	$ Revenue Cross-sell [Saber]				R$ 0,00
						
	CR8	% Revenue Cross-sell [Ter]				0,00%
	VM8	$ Revenue Cross-sell [Ter]				R$ 0,00
						
	CR8	% Revenue Upsell [Executar-no loyalty]				0,00%
	VM8	$ Revenue Upsell [Executar-no loyalty]				R$ 0,00
						
	CR8	% Revenue Upsell [Executar-loyalty]				0,00%
	VM8	$ Revenue Upsell [Executar-loyalty]				R$ 0,00
						
	CR8	% Revenue Upsell [Potencializar]				0,00%
	VM8	$ Revenue Upsell [Potencializar]				R$ 0,00
						
		Enterprise				
			# Enterprise Go Lives			28
			$ Enterprise Revenue Live		1,04%	R$ 1.455.264
			$ Annual WTP			R$ 5.000.000
			$ Total Share of Wallet			R$ 140.000.000
						
			% Share of Wallet Desired		2%	0,00%
			$ Share of Wallet Desired		R$ 2.910.528	
			$ Share of Wallet Actived			R$ 1.455.264
			$ Expansion Goal		R$ 1.455.264	R$ 0
						
			$ Share of Wallet Remaining			R$ 138.544.736
			% Index Saturation Base			0,74%
			% Index Monetization Potential			98,96%
						
			# Expansions			0
			$ Enterprise Average Ticket			R$ 44.500
			$ Revenue Expansion			R$ 0,00
				% [Saber]		50,00%
				% [Ter]		40,00%
				% [Executar-no loyalty]		5,00%
				% [Executar-loyalty]		5,00%
				% [Potencializar]		0,00%
				$ [Saber] Average Ticket 		R$ 70.000,00
				$ [Ter]  Average Ticket 		R$ 10.000,00
				$ [Executar-no loyalty] Average Ticket 		R$ 10.000,00
				$ [Executar-loyalty] Average Ticket 		R$ 100.000,00
				$ [Potencializar] Average Ticket 		R$ 0,00
				# Lowest Ticket Index		2
						
				# [Saber]		0
				$ [Saber] Revenue Expansion		R$ 0
						
				# [Ter]		0
				$ [Ter] Revenue Expansion		R$ 0
						
				# [Executar-no loyalty]		0
				$ [Executar-no loyalty] Revenue Expansion		R$ 0
						
				# [Executar-loyalty]		0
				$ [Executar-loyalty] Revenue Expansion		R$ 0
						
				# [Potencializar]		0
				$ [Potencializar] Revenue Expansion		R$ 0
						
		Large				
			# Large Go Lives			37
			$ Large Revenue Live		1,30%	R$ 1.441.500
			$ Annual WTP			R$ 3.000.000
			$ Total Share of Wallet			R$ 111.000.000
						
			% Share of Wallet Desired		4%	0%
			$ Share of Wallet Desired		R$ 4.324.500	
			$ Share of Wallet Actived			R$ 1.441.500
			$ Expansion Goal		R$ 2.883.000	R$ 0
						
			$ Share of Wallet Remaining			R$ 109.558.500
			% Index Saturation Base			1,30%
			% Index Monetization Potential			98,70%
						
			# Expansions			0
			$ Large Average Ticket			R$ 22.000
			$ Revenue Expansion			R$ 0,00
				% [Saber]		40,00%
				% [Ter]		40,00%
				% [Executar-no loyalty]		10,00%
				% [Executar-loyalty]		10,00%
				% [Potencializar]		0,00%
				$ [Saber] Average Ticket 		R$ 25.000,00
				$ [Ter]  Average Ticket 		R$ 10.000,00
				$ [Executar-no loyalty] Average Ticket 		R$ 8.000,00
				$ [Executar-loyalty] Average Ticket 		R$ 72.000,00
				$ [Potencializar] Average Ticket 		R$ 0,00
				# Lowest Ticket Index		3
						
				# [Saber]		0
				$ [Saber] Revenue Expansion		R$ 0
						
				# [Ter]		0
				$ [Ter] Revenue Expansion		R$ 0
						
				# [Executar-no loyalty]		0
				$ [Executar-no loyalty] Revenue Expansion		R$ 0
						
				# [Executar-loyalty]		0
				$ [Executar-loyalty] Revenue Expansion		R$ 0
						
				# [Potencializar]		0
				$ [Potencializar] Revenue Expansion		R$ 0
						
		Medium				
			# Medium Go Lives			196
			$ Medium Revenue Live		2,82%	R$ 5.521.410
			$ Annual WTP			R$ 1.000.000
			$ Total Share of Wallet			R$ 196.000.000
						
			% Share of Wallet Desired		6%	0,00%
			$ Share of Wallet Desired		R$ 11.042.820	
			$ Share of Wallet Actived			R$ 5.521.410
			$ Expansion Goal		R$ 5.521.410	R$ 0
						
			$ Share of Wallet Remaining			R$ 190.478.590
			% Index Saturation Base			2,82%
			% Index Monetization Potential			97,18%
						
			# Expansions			0
			$ Medium Average Ticket			R$ 18.100
			$ Revenue Expansion			R$ 0,00
				% [Saber]		25,00%
				% [Ter]		35,00%
				% [Executar-no loyalty]		20,00%
				% [Executar-loyalty]		20,00%
				% [Potencializar]		0,00%
				$ [Saber] Average Ticket 		R$ 20.000,00
				$ [Ter]  Average Ticket 		R$ 10.000,00
				$ [Executar-no loyalty] Average Ticket 		R$ 6.000,00
				$ [Executar-loyalty] Average Ticket 		R$ 42.000,00
				$ [Potencializar] Average Ticket 		R$ 0,00
				# Lowest Ticket Index		3
						
				# [Saber]		0
				$ [Saber] Revenue Expansion		R$ 0
						
				# [Ter]		0
				$ [Ter] Revenue Expansion		R$ 0
						
				# [Executar-no loyalty]		0
				$ [Executar-no loyalty] Revenue Expansion		R$ 0
						
				# [Executar-loyalty]		0
				$ [Executar-loyalty] Revenue Expansion		R$ 0
						
				# [Potencializar]		0
				$ [Potencializar] Revenue Expansion		R$ 0
						
						
		Small				
			# Small Go Lives			462
			$ Small Revenue Live		20,33%	R$ 8.453.700
			$ Annual WTP			R$ 90.000
			$ Total Share of Wallet			R$ 41.580.000
						
			% Share of Wallet Desired		30%	0,00%
			$ Share of Wallet Desired		R$ 12.680.550	
			$ Share of Wallet Actived			R$ 8.453.700
			$ Expansion Goal		R$ 4.226.850	R$ 0
						
			$ Share of Wallet Remaining			R$ 33.126.300
			% Index Saturation Base			20,33%
			% Index Monetization Potential			79,67%
						
			# Expansions			0
			$ Small Average Ticket			R$ 8.800
			$ Revenue Expansion			R$ 0,00
				% [Saber]		60,00%
				% [Ter]		40,00%
				% [Executar-no loyalty]		0,00%
				% [Executar-loyalty]		0,00%
				% [Potencializar]		0,00%
				$ [Saber] Average Ticket 		R$ 8.000,00
				$ [Ter]  Average Ticket 		R$ 10.000,00
				$ [Executar-no loyalty] Average Ticket 		R$ 0,00
				$ [Executar-loyalty] Average Ticket 		R$ 0,00
				$ [Potencializar] Average Ticket 		R$ 0,00
				# Lowest Ticket Index		1
						
				# [Saber]		0
				$ [Saber] Revenue Expansion		R$ 0
						
				# [Ter]		0
				$ [Ter] Revenue Expansion		R$ 0
						
				# [Executar-no loyalty]		0
				$ [Executar-no loyalty] Revenue Expansion		R$ 0
						
				# [Executar-loyalty]		0
				$ [Executar-loyalty] Revenue Expansion		R$ 0
						
				# [Potencializar]		0
				$ [Potencializar] Revenue Expansion		R$ 0
						
		Tiny				
			# Tiny Go Lives			218
			$ Tiny Revenue Live		26,94%	R$ 2.936.475
			$ Annual WTP			R$ 50.000
			$ Total Share of Wallet			R$ 10.900.000
						
			% Share of Wallet Desired		40%	0%
			$ Share of Wallet Desired		R$ 4.404.713	
			$ Share of Wallet Actived			R$ 2.936.475
			$ Expansion Goal		R$ 1.468.238	R$ 0
						
			$ Share of Wallet Remaining			R$ 7.963.525
			% Index Saturation Base			26,94%
			% Index Monetization Potential			73,06%
						
			# Expansions			0
			$ Tiny Average Ticket			R$ 7.200
			$ Revenue Expansion			R$ 0,00
				% [Saber]		60,00%
				% [Ter]		40,00%
				% [Executar-no loyalty]		0,00%
				% [Executar-loyalty]		0,00%
				% [Potencializar]		0,00%
				$ [Saber] Average Ticket 		R$ 8.000,00
				$ [Ter]  Average Ticket 		R$ 6.000,00
				$ [Executar-no loyalty] Average Ticket 		R$ 0,00
				$ [Executar-loyalty] Average Ticket 		R$ 0,00
				$ [Potencializar] Average Ticket 		R$ 0,00
				# Lowest Ticket Index		2
						
				# [Saber]		0
				$ [Saber] Revenue Expansion		R$ 0
						
				# [Ter]		0
				$ [Ter] Revenue Expansion		R$ 0
						
				# [Executar-no loyalty]		0
				$ [Executar-no loyalty] Revenue Expansion		R$ 0
						
				# [Executar-loyalty]		0
				$ [Executar-loyalty] Revenue Expansion		R$ 0
						
				# [Potencializar]		0
				$ [Potencializar] Revenue Expansion		R$ 0
export interface DDSInstance {
  _dds_init(): void;
  _do_dds_solve_board(
    contract_bid: number,    // 0=clubs, 1=diamonds, 2=hearts, 3=spades, 4=NT (our encoding)
    hand_to_play: number,    // 0=north, 1=east, 2=south, 3=west
    currentTrick0: number,   // card encoding: suit*13 + rank (our encoding)
    currentTrick1: number,   // -1 if no card played
    currentTrick2: number,   // -1 if no card played
    target: number,
    solution: number,
    pbn_remain_cards: number, // pointer to PBN deal string
    output_array: number     // pointer to output array of (card, score) pairs
  ): number;
  allocateUTF8(str: string): number;
  _malloc(size: number): number;
  _free(ptr: number): void;
  getValue(ptr: number, type: string): number;
}
import { chatService } from '../src/services/chatService.js';

console.log("Q1: انت مييين ->", chatService.getContextualSovythosReply('انت مييين'));
console.log("Q2: يبني اسمعني ->", chatService.getContextualSovythosReply('يبني اسمعني'));
console.log("Q3: ازيك يا صاحبي ->", chatService.getContextualSovythosReply('ازيك يا صاحبي'));
console.log("Q4: كود بايثون فيه باج ->", chatService.getContextualSovythosReply('كود بايثون فيه باج'));
